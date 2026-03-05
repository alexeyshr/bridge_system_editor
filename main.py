#!/usr/bin/env python3
"""K7 Editor — web app for K7-Standard bridge bidding system"""

import hashlib, json, os, re, sqlite3, yaml
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Optional, Annotated

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field
import uvicorn

try:
    import numpy as np
    from scipy import sparse
    from sklearn.decomposition import TruncatedSVD
    from sklearn.feature_extraction.text import TfidfVectorizer
except Exception:
    np = None
    sparse = None
    TruncatedSVD = None
    TfidfVectorizer = None

# ── Paths ────────────────────────────────────────────────────────────────────
BASE     = Path(__file__).parent
YAML_SRC = Path('/root/.openclaw/workspace/Bridge/knowledge/systems/k7-standard.yaml')
YAML_SYSTEM_DIR = BASE.parent / 'YAML_system'
DB_PATH  = BASE / 'k7.db'

# ── DB ───────────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS sequences (
            id INTEGER PRIMARY KEY,
            seq_key TEXT UNIQUE,
            parent_key TEXT,
            call TEXT,
            meaning_json TEXT,
            hcp_min INTEGER,
            hcp_max INTEGER,
            forcing TEXT,
            seq_type TEXT,
            notes TEXT,
            alert INTEGER DEFAULT 0,
            side TEXT,
            section TEXT
        );
        CREATE TABLE IF NOT EXISTS status (
            seq_key TEXT PRIMARY KEY,
            accepted INTEGER DEFAULT 0,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY,
            seq_key TEXT,
            author TEXT DEFAULT 'Алексей',
            text TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS revisions (
            id INTEGER PRIMARY KEY,
            seq_key TEXT,
            field TEXT,
            old_value TEXT,
            new_value TEXT,
            changed_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_seq_parent ON sequences(parent_key);
        CREATE INDEX IF NOT EXISTS idx_comments_key ON comments(seq_key);
    ''')
    conn.commit()
    conn.close()


def infer_section_from_seq_key(seq_key: str) -> str:
    """Best-effort section inference for newly created sequences."""
    if not seq_key:
        return "custom"
    first = seq_key.split()[0].upper()
    mapping = {
        "1C": "responses_1C", "1♣": "responses_1C",
        "1D": "responses_1D", "1♦": "responses_1D",
        "1H": "responses_1H", "1♥": "responses_1H",
        "1S": "responses_1S", "1♠": "responses_1S",
        "1NT": "responses_1nt", "1БК": "responses_1nt",
        "2C": "responses_2C", "2♣": "responses_2C",
        "2D": "responses_2D", "2♦": "responses_2D",
        "2H": "responses_2H", "2♥": "responses_2H",
        "2S": "responses_2S", "2♠": "responses_2S",
        "2NT": "responses_2NT", "2БК": "responses_2NT",
    }
    return mapping.get(first, "custom")


# ── Local Semantic Search (TF-IDF + LSA) ────────────────────────────────────
_semantic_lock = Lock()
_semantic_index = {
    'signature': None,
    'seq_keys': [],
    'word_vec': None,
    'char_vec': None,
    'svd': None,
    'doc_matrix': None,
}


def _semantic_available() -> bool:
    return (
        np is not None and
        sparse is not None and
        TruncatedSVD is not None and
        TfidfVectorizer is not None
    )


def _norm_text(text: str) -> str:
    s = str(text or '').lower()
    s = (
        s.replace('♣', ' c ')
         .replace('♦', ' d ')
         .replace('♥', ' h ')
         .replace('♠', ' s ')
         .replace('бк', ' nt ')
    )
    s = re.sub(r'[^0-9a-zа-яё+\- ]+', ' ', s, flags=re.IGNORECASE)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def _build_doc_text(row: dict) -> str:
    parts = [
        row.get('seq_key', ''),
        row.get('notes', ''),
        row.get('forcing', ''),
        row.get('seq_type', ''),
    ]
    try:
        m = json.loads(row.get('meaning_json') or '{}')
        if isinstance(m, dict):
            parts.append(m.get('notes', ''))
            shows = m.get('shows', [])
            if isinstance(shows, str):
                shows = [shows]
            if isinstance(shows, list):
                parts.extend(str(x) for x in shows)

            hcp = m.get('hcp', {})
            if isinstance(hcp, dict):
                parts.append(hcp.get('notes', ''))

            shape = m.get('shape', {})
            if isinstance(shape, dict):
                constraints = shape.get('constraints', [])
                if isinstance(constraints, list):
                    parts.extend(str(x) for x in constraints)
                patterns = shape.get('patterns', [])
                if isinstance(patterns, list):
                    parts.extend(str(x) for x in patterns)
    except Exception:
        pass
    return _norm_text(' '.join(str(x) for x in parts if x))


def _semantic_signature(rows: list[dict]) -> str:
    h = hashlib.sha1()
    for r in rows:
        chunk = '||'.join([
            str(r.get('seq_key', '')),
            str(r.get('notes', '')),
            str(r.get('forcing', '')),
            str(r.get('seq_type', '')),
            str(r.get('meaning_json', '')),
        ])
        h.update(chunk.encode('utf-8', errors='ignore'))
    return h.hexdigest()


def _ensure_semantic_index(conn):
    if not _semantic_available():
        return False

    rows = [dict(r) for r in conn.execute(
        'SELECT seq_key, notes, forcing, seq_type, meaning_json FROM sequences ORDER BY seq_key'
    ).fetchall()]
    if not rows:
        return False

    signature = _semantic_signature(rows)
    with _semantic_lock:
        if _semantic_index['signature'] == signature and _semantic_index['doc_matrix'] is not None:
            return True

        docs = [_build_doc_text(r) for r in rows]
        seq_keys = [r['seq_key'] for r in rows]

        word_vec = TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 2),
            min_df=1,
            max_features=12000,
        )
        char_vec = TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(3, 5),
            min_df=1,
            max_features=12000,
        )
        xw = word_vec.fit_transform(docs)
        xc = char_vec.fit_transform(docs)
        x = sparse.hstack([xw, xc], format='csr')

        svd = None
        doc_matrix = None

        max_components = min(128, x.shape[0] - 1, x.shape[1] - 1)
        if max_components >= 2:
            svd = TruncatedSVD(n_components=max_components, random_state=42)
            dense = svd.fit_transform(x)
            norms = np.linalg.norm(dense, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            doc_matrix = dense / norms
        else:
            row_norms = np.sqrt(x.multiply(x).sum(axis=1)).A1
            row_norms[row_norms == 0] = 1.0
            doc_matrix = sparse.diags(1.0 / row_norms).dot(x)

        _semantic_index['signature'] = signature
        _semantic_index['seq_keys'] = seq_keys
        _semantic_index['word_vec'] = word_vec
        _semantic_index['char_vec'] = char_vec
        _semantic_index['svd'] = svd
        _semantic_index['doc_matrix'] = doc_matrix
    return True


def _semantic_rank_rows(conn, rows: list[dict], query: str):
    if not rows:
        return []
    if not _ensure_semantic_index(conn):
        return None

    q = _norm_text(query)
    if not q:
        return rows

    with _semantic_lock:
        seq_idx = {k: i for i, k in enumerate(_semantic_index['seq_keys'])}
        candidate = [(seq_idx.get(r.get('seq_key', '')), r) for r in rows]
        candidate = [(i, r) for i, r in candidate if i is not None]
        if not candidate:
            return []

        idxs = [i for i, _ in candidate]
        cand_rows = [r for _, r in candidate]

        xq = sparse.hstack([
            _semantic_index['word_vec'].transform([q]),
            _semantic_index['char_vec'].transform([q]),
        ], format='csr')

        if _semantic_index['svd'] is not None:
            qv = _semantic_index['svd'].transform(xq)[0]
            qn = np.linalg.norm(qv)
            if qn == 0:
                return []
            qv = qv / qn
            sims = _semantic_index['doc_matrix'][idxs].dot(qv)
        else:
            qn = np.sqrt(xq.multiply(xq).sum())
            if qn == 0:
                return []
            xq = xq * (1.0 / qn)
            sims = _semantic_index['doc_matrix'][idxs].dot(xq.T).toarray().ravel()

    # Small lexical boost for exact snippets.
    qn = _norm_text(query)
    for i, row in enumerate(cand_rows):
        sk = _norm_text(row.get('seq_key', ''))
        notes = _norm_text(row.get('notes', ''))
        if qn and qn in sk:
            sims[i] += 0.22
        if qn and qn in notes:
            sims[i] += 0.1
        if qn and sk.startswith(qn):
            sims[i] += 0.18

    if len(sims) == 0:
        return []
    top_score = float(np.max(sims))
    if top_score < 0.08:
        return None

    ranked_idx = np.argsort(-sims)
    out = []
    for i in ranked_idx:
        score = float(sims[i])
        if score < 0.03:
            continue
        row = dict(cand_rows[int(i)])
        row['semantic_score'] = round(score, 4)
        out.append(row)
        if len(out) >= 120:
            break
    return out

# ── YAML Import ───────────────────────────────────────────────────────────────
def import_yaml():
    with open(YAML_SRC, encoding='utf-8') as f:
        data = yaml.safe_load(f)

    rows = []
    def process_entry(entry, section):
        if not isinstance(entry, dict):
            return
        ctx = entry.get('context', {})
        seq = ctx.get('sequence', [])
        if not seq:
            return
        seq_key = ' '.join(seq)
        parent_key = ' '.join(seq[:-1]) if len(seq) > 1 else None
        call = seq[-1] if seq else ''
        side = ctx.get('side', '')
        m = entry.get('meaning', {}) or {}
        if isinstance(m, str):
            notes_val = m; m = {}
        else:
            notes_val = m.get('notes', '')

        hcp = m.get('hcp', {}) or {}
        forcing = _normalize_forcing(m.get('forcing', ''))
        m['forcing'] = forcing
        seq_type = _normalize_seq_type(m.get('type', ''))
        m['type'] = seq_type
        rows.append({
            'seq_key': seq_key,
            'parent_key': parent_key,
            'call': call,
            'meaning_json': json.dumps(m, ensure_ascii=False),
            'hcp_min': hcp.get('min'),
            'hcp_max': hcp.get('max'),
            'forcing': forcing,
            'seq_type': seq_type,
            'notes': notes_val,
            'alert': 1 if m.get('alert') else 0,
            'side': side,
            'section': section,
        })
        for cont in entry.get('continuations', []):
            if not isinstance(cont, dict):
                continue
            cont_call = cont.get('call', '')
            if not cont_call or cont_call == '_section_':
                continue
            cont_seq = seq + [cont_call]
            cont_key = ' '.join(cont_seq)
            cont_parent = seq_key
            cm = cont.get('meaning', {}) or {}
            if isinstance(cm, str):
                cm_notes = cm; cm = {}
            else:
                cm_notes = cm.get('notes', '')
            chcp = cm.get('hcp', {}) or {}
            cforcing = _normalize_forcing(cm.get('forcing', ''))
            cm['forcing'] = cforcing
            cseq_type = _normalize_seq_type(cm.get('type', ''))
            cm['type'] = cseq_type
            cont_side = 'opener' if side == 'responder' else 'responder'
            rows.append({
                'seq_key': cont_key,
                'parent_key': cont_parent,
                'call': cont_call,
                'meaning_json': json.dumps(cm, ensure_ascii=False),
                'hcp_min': chcp.get('min'),
                'hcp_max': chcp.get('max'),
                'forcing': cforcing,
                'seq_type': cseq_type,
                'notes': cm_notes,
                'alert': 1 if cm.get('alert') else 0,
                'side': cont_side,
                'section': section,
            })

    for section, entries in data.items():
        if isinstance(entries, list):
            for e in entries:
                process_entry(e, section)

    seen = {}
    unique = []
    for r in rows:
        if r['seq_key'] not in seen:
            seen[r['seq_key']] = True
            unique.append(r)

    conn = get_db()
    conn.execute('DELETE FROM sequences')
    conn.executemany('''
        INSERT OR REPLACE INTO sequences
        (seq_key, parent_key, call, meaning_json, hcp_min, hcp_max,
         forcing, seq_type, notes, alert, side, section)
        VALUES (:seq_key, :parent_key, :call, :meaning_json, :hcp_min, :hcp_max,
                :forcing, :seq_type, :notes, :alert, :side, :section)
    ''', unique)
    conn.commit()
    conn.close()
    return len(unique)


def _read_text_with_fallback(path: Path) -> str:
    for enc in ('utf-8', 'utf-8-sig', 'cp1251'):
        try:
            return path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding='utf-8', errors='replace')


def _extract_yaml_blocks(md_text: str):
    blocks = re.findall(r'```(?:yaml|yml)\s*(.*?)```', md_text, flags=re.IGNORECASE | re.DOTALL)
    if blocks:
        return blocks
    return [md_text]


def _to_int_or_none(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        s = value.strip()
        if not s or s.lower() == 'null':
            return None
        if re.fullmatch(r'-?\d+', s):
            return int(s)
    return None

def _normalize_forcing(value) -> str:
    raw = str(value or '').strip()
    if not raw:
        return ''
    up = raw.upper()
    if up == 'F':
        return '1RF'
    return up

def _normalize_seq_type(value) -> str:
    raw = str(value or '').strip().lower()
    if raw == 'invite':
        return 'natural'
    return raw


def import_yaml_system():
    if not YAML_SYSTEM_DIR.exists():
        raise FileNotFoundError(f'YAML_system not found: {YAML_SYSTEM_DIR}')

    rows = []
    for md_file in sorted(YAML_SYSTEM_DIR.glob('*.md')):
        text = _read_text_with_fallback(md_file)
        for block in _extract_yaml_blocks(text):
            data = yaml.safe_load(block)
            if data is None:
                continue

            if isinstance(data, dict):
                if 'convention_entries' in data or 'convention_entry' in data:
                    continue
                entries = [data]
            elif isinstance(data, list):
                entries = data
            else:
                continue

            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                ctx = entry.get('context') or {}
                seq = ctx.get('sequence') or []
                call = (entry.get('call') or '').strip()

                if not isinstance(seq, list) or not call:
                    continue

                seq_tokens = [str(x).strip() for x in seq if str(x).strip()]
                full_tokens = seq_tokens + [call]
                seq_key = ' '.join(full_tokens)
                if not seq_key:
                    continue

                parent_key = ' '.join(full_tokens[:-1]) if len(full_tokens) > 1 else None
                m = entry.get('meaning') or {}
                if isinstance(m, str):
                    notes_val = m
                    m = {}
                else:
                    notes_val = m.get('notes', '')

                hcp = m.get('hcp') or {}
                forcing = _normalize_forcing(m.get('forcing', ''))
                m['forcing'] = forcing
                seq_type = _normalize_seq_type(m.get('type', ''))
                m['type'] = seq_type
                side = (ctx.get('side') or '').strip()
                if side not in ('opener', 'responder'):
                    depth = len(full_tokens) - 1
                    side = 'opener' if depth % 2 == 0 else 'responder'

                rows.append({
                    'seq_key': seq_key,
                    'parent_key': parent_key,
                    'call': call,
                    'meaning_json': json.dumps(m, ensure_ascii=False),
                    'hcp_min': _to_int_or_none(hcp.get('min')) if isinstance(hcp, dict) else None,
                    'hcp_max': _to_int_or_none(hcp.get('max')) if isinstance(hcp, dict) else None,
                    'forcing': forcing,
                    'seq_type': seq_type,
                    'notes': str(notes_val or ''),
                    'alert': 1 if m.get('alert') else 0,
                    'side': side,
                    'section': infer_section_from_seq_key(seq_key),
                })

    seen = {}
    unique = []
    for r in rows:
        if r['seq_key'] in seen:
            continue
        seen[r['seq_key']] = True
        unique.append(r)

    conn = get_db()
    conn.execute('DELETE FROM sequences')
    conn.executemany('''
        INSERT OR REPLACE INTO sequences
        (seq_key, parent_key, call, meaning_json, hcp_min, hcp_max,
         forcing, seq_type, notes, alert, side, section)
        VALUES (:seq_key, :parent_key, :call, :meaning_json, :hcp_min, :hcp_max,
                :forcing, :seq_type, :notes, :alert, :side, :section)
    ''', unique)
    conn.commit()
    conn.close()
    return len(unique)

# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app):
    init_db()
    conn = get_db()
    count = conn.execute('SELECT COUNT(*) FROM sequences').fetchone()[0]
    conn.close()
    if count == 0:
        print('Importing YAML...')
        if YAML_SRC.exists():
            n = import_yaml()
        elif YAML_SYSTEM_DIR.exists():
            n = import_yaml_system()
        else:
            n = 0
        print(f'Imported {n} sequences')
    else:
        print(f'DB has {count} sequences')
    yield

app = FastAPI(title='K7 Editor', lifespan=lifespan)

# ── Models ────────────────────────────────────────────────────────────────────
HcpValue = Annotated[int, Field(strict=True, ge=0, le=37)]

class SeqUpdate(BaseModel):
    notes: Optional[str] = None
    forcing: Optional[str] = None
    seq_type: Optional[str] = None
    hcp_min: Optional[HcpValue] = None
    hcp_max: Optional[HcpValue] = None
    alert: Optional[bool] = None
    shape: Optional[dict] = None
    shows: Optional[list] = None


class SeqCreate(BaseModel):
    parent_key: Optional[str] = None
    call: str
    notes: Optional[str] = ""
    forcing: Optional[str] = ""
    seq_type: Optional[str] = ""
    hcp_min: Optional[HcpValue] = None
    hcp_max: Optional[HcpValue] = None
    alert: Optional[bool] = False
    natural: Optional[bool] = None
    side: Optional[str] = None

class CommentIn(BaseModel):
    text: str
    author: str = 'Алексей'

class StatusIn(BaseModel):
    accepted: bool

class SeqRenameIn(BaseModel):
    new_call: str

# ── API ───────────────────────────────────────────────────────────────────────
@app.get('/api/sequences')
def get_sequences(section: str = '', search: str = '', accepted: str = '', commented: str = ''):
    conn = get_db()
    try:
        base_q = '''SELECT s.*,
                           COALESCE(st.accepted, 0) as is_accepted,
                           COALESCE(cc.comments_count, 0) as comments_count
                    FROM sequences s
                    LEFT JOIN status st ON s.seq_key = st.seq_key
                    LEFT JOIN (
                      SELECT seq_key, COUNT(*) AS comments_count
                      FROM comments
                      GROUP BY seq_key
                    ) cc ON s.seq_key = cc.seq_key
                    WHERE 1=1'''
        base_params = []
        if section:
            base_q += ' AND s.section = ?'
            base_params.append(section)
        if accepted == '1':
            base_q += ' AND COALESCE(st.accepted,0) = 1'
        elif accepted == '0':
            base_q += ' AND COALESCE(st.accepted,0) = 0'
        if commented == '1':
            base_q += ' AND COALESCE(cc.comments_count,0) > 0'

        q_search = (search or '').strip()
        if q_search:
            # Try semantic ranking first (local, no external API).
            rows = [dict(r) for r in conn.execute(base_q, base_params).fetchall()]
            ranked = _semantic_rank_rows(conn, rows, q_search)
            if ranked is not None:
                return ranked

            # Fallback to classic substring search.
            like_q = base_q + ' AND (s.seq_key LIKE ? OR s.notes LIKE ? OR s.forcing LIKE ?)'
            like_params = base_params + [f'%{q_search}%'] * 3
            like_q += ' ORDER BY s.seq_key'
            rows = conn.execute(like_q, like_params).fetchall()
            return [dict(r) for r in rows]

        q = base_q + ' ORDER BY s.seq_key'
        rows = conn.execute(q, base_params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@app.get('/api/sequences/{seq_key:path}')
def get_sequence(seq_key: str):
    conn = get_db()
    row = conn.execute('''SELECT s.*, COALESCE(st.accepted,0) as is_accepted
        FROM sequences s LEFT JOIN status st ON s.seq_key = st.seq_key
        WHERE s.seq_key = ?''', [seq_key]).fetchone()
    if not row:
        raise HTTPException(404)
    r = dict(row)
    try:
        parsed_meaning = json.loads(r.get('meaning_json') or '{}')
        r['meaning'] = parsed_meaning if isinstance(parsed_meaning, dict) else {}
    except Exception:
        r['meaning'] = {}
    r['comments'] = [dict(c) for c in conn.execute(
        'SELECT * FROM comments WHERE seq_key = ? ORDER BY created_at', [seq_key])]
    r['children'] = [dict(c) for c in conn.execute('''
        SELECT s.seq_key, s.call, s.notes, s.forcing, s.seq_type, s.alert,
               s.hcp_min, s.hcp_max, s.meaning_json,
               COALESCE(st.accepted, 0) as is_accepted,
               COALESCE(cc.comments_count, 0) as comments_count
        FROM sequences s
        LEFT JOIN status st ON s.seq_key = st.seq_key
        LEFT JOIN (
          SELECT seq_key, COUNT(*) AS comments_count
          FROM comments
          GROUP BY seq_key
        ) cc ON s.seq_key = cc.seq_key
        WHERE s.parent_key = ?
        ORDER BY s.seq_key
    ''', [seq_key])]
    for c in r['children']:
        try:
            m = json.loads(c.get('meaning_json') or '{}')
            shows = m.get('shows', [])
            if isinstance(shows, str):
                shows = [shows]
            if not isinstance(shows, list):
                shows = []
        except Exception:
            shows = []
        c['shows'] = [str(x).strip() for x in shows if str(x).strip()]
    conn.close()
    return r

@app.put('/api/sequences/{seq_key:path}')
def update_sequence(seq_key: str, body: SeqUpdate):
    conn = get_db()
    row = conn.execute('SELECT * FROM sequences WHERE seq_key = ?', [seq_key]).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404)

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        conn.close()
        return {'ok': True}

    try:
        meaning = json.loads(row['meaning_json'] or '{}')
        if not isinstance(meaning, dict):
            meaning = {}
    except Exception:
        meaning = {}

    db_updates = {}
    meaning_changed = False

    def add_revision(field: str, old_val, new_val):
        if str(old_val) == str(new_val):
            return
        conn.execute(
            'INSERT INTO revisions (seq_key, field, old_value, new_value) VALUES (?,?,?,?)',
            [seq_key, field, str(old_val), str(new_val)]
        )

    if 'notes' in updates:
        new_notes = updates['notes'] or ''
        add_revision('notes', row['notes'], new_notes)
        db_updates['notes'] = new_notes
        meaning['notes'] = new_notes
        meaning_changed = True

    if 'forcing' in updates:
        new_forcing = _normalize_forcing(updates['forcing'] or '')
        add_revision('forcing', row['forcing'], new_forcing)
        db_updates['forcing'] = new_forcing
        meaning['forcing'] = new_forcing
        meaning_changed = True

    if 'seq_type' in updates:
        new_type = _normalize_seq_type(updates['seq_type'] or '')
        add_revision('seq_type', row['seq_type'], new_type)
        db_updates['seq_type'] = new_type
        meaning['type'] = new_type
        meaning_changed = True

    if 'alert' in updates:
        new_alert = 1 if updates['alert'] else 0
        add_revision('alert', bool(row['alert']), bool(new_alert))
        db_updates['alert'] = new_alert
        meaning['alert'] = bool(new_alert)
        meaning_changed = True

    if 'hcp_min' in updates or 'hcp_max' in updates:
        hcp = meaning.get('hcp')
        if not isinstance(hcp, dict):
            hcp = {}

        if 'hcp_min' in updates:
            new_hcp_min = updates['hcp_min']
            add_revision('hcp_min', row['hcp_min'], new_hcp_min)
            db_updates['hcp_min'] = new_hcp_min
            hcp['min'] = new_hcp_min
            meaning_changed = True

        if 'hcp_max' in updates:
            new_hcp_max = updates['hcp_max']
            add_revision('hcp_max', row['hcp_max'], new_hcp_max)
            db_updates['hcp_max'] = new_hcp_max
            hcp['max'] = new_hcp_max
            meaning_changed = True

        meaning['hcp'] = hcp

    if 'shape' in updates:
        new_shape = updates['shape'] or {}
        if not isinstance(new_shape, dict):
            conn.close()
            raise HTTPException(400, 'shape must be an object')
        old_shape = meaning.get('shape', {})
        add_revision(
            'shape',
            json.dumps(old_shape, ensure_ascii=False),
            json.dumps(new_shape, ensure_ascii=False)
        )
        meaning['shape'] = new_shape
        meaning_changed = True

    if 'shows' in updates:
        new_shows = updates['shows'] or []
        if not isinstance(new_shows, list):
            conn.close()
            raise HTTPException(400, 'shows must be a list')
        normalized_shows = [str(x).strip() for x in new_shows if str(x).strip()]
        old_shows = meaning.get('shows', [])
        add_revision(
            'shows',
            json.dumps(old_shows, ensure_ascii=False),
            json.dumps(normalized_shows, ensure_ascii=False)
        )
        meaning['shows'] = normalized_shows
        meaning_changed = True

    if meaning_changed:
        db_updates['meaning_json'] = json.dumps(meaning, ensure_ascii=False)

    if not db_updates:
        conn.close()
        return {'ok': True}

    set_clause = ', '.join(f'{k} = ?' for k in db_updates.keys())
    conn.execute(
        f'UPDATE sequences SET {set_clause} WHERE seq_key = ?',
        list(db_updates.values()) + [seq_key]
    )
    conn.commit(); conn.close()
    return {'ok': True}


@app.post('/api/sequences')
def create_sequence(body: SeqCreate):
    call = (body.call or '').strip()
    if not call:
        raise HTTPException(400, 'Call is required')
    if len(call) > 20:
        raise HTTPException(400, 'Call is too long')

    conn = get_db()
    parent = None
    if body.parent_key:
        parent = conn.execute(
            'SELECT seq_key, side, section FROM sequences WHERE seq_key = ?',
            [body.parent_key]
        ).fetchone()
        if not parent:
            conn.close()
            raise HTTPException(404, 'Parent sequence not found')

    seq_key = (body.parent_key.strip() + ' ' + call).strip() if body.parent_key else call
    exists = conn.execute('SELECT 1 FROM sequences WHERE seq_key = ?', [seq_key]).fetchone()
    if exists:
        conn.close()
        raise HTTPException(409, f'Sequence already exists: {seq_key}')

    if body.side in ('opener', 'responder'):
        side = body.side
    elif parent:
        side = 'responder' if parent['side'] == 'opener' else 'opener'
    else:
        side = 'opener'

    section = parent['section'] if parent else infer_section_from_seq_key(seq_key)
    notes = body.notes or ''
    forcing = _normalize_forcing(body.forcing or '')
    seq_type = _normalize_seq_type(body.seq_type or '')
    alert = 1 if body.alert else 0

    meaning = {
        'hcp': {'min': body.hcp_min, 'max': body.hcp_max},
        'forcing': forcing,
        'type': seq_type,
        'notes': notes,
        'alert': bool(alert),
    }
    if body.natural is not None:
        meaning['natural'] = body.natural

    conn.execute('''
        INSERT INTO sequences
        (seq_key, parent_key, call, meaning_json, hcp_min, hcp_max,
         forcing, seq_type, notes, alert, side, section)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', [
        seq_key,
        body.parent_key,
        call,
        json.dumps(meaning, ensure_ascii=False),
        body.hcp_min,
        body.hcp_max,
        forcing,
        seq_type,
        notes,
        alert,
        side,
        section,
    ])
    conn.commit()
    conn.close()
    return {'ok': True, 'seq_key': seq_key}

@app.put('/api/seq-rename/{seq_key:path}')
def rename_sequence(seq_key: str, body: SeqRenameIn):
    new_call = (body.new_call or '').strip()
    if not new_call:
        raise HTTPException(400, 'new_call is required')
    if len(new_call) > 20:
        raise HTTPException(400, 'new_call is too long')

    conn = get_db()
    try:
        target = conn.execute(
            'SELECT id, seq_key, parent_key, call FROM sequences WHERE seq_key = ?',
            [seq_key]
        ).fetchone()
        if not target:
            raise HTTPException(404, 'Sequence not found')

        parent_key = target['parent_key']
        old_call = target['call'] or ''
        new_root_key = ((parent_key + ' ') if parent_key else '') + new_call
        if new_root_key == seq_key:
            return {'ok': True, 'new_seq_key': seq_key, 'renamed': 0}

        subtree = conn.execute(
            '''SELECT id, seq_key, parent_key, call, section
               FROM sequences
               WHERE seq_key = ? OR seq_key LIKE ?
               ORDER BY LENGTH(seq_key) ASC, seq_key ASC''',
            [seq_key, seq_key + ' %']
        ).fetchall()
        if not subtree:
            raise HTTPException(404, 'Sequence not found')

        old_keys = [r['seq_key'] for r in subtree]
        old_key_set = set(old_keys)
        mapping = {}
        for old_key in old_keys:
            if old_key == seq_key:
                mapping[old_key] = new_root_key
            else:
                suffix = old_key[len(seq_key):]
                mapping[old_key] = new_root_key + suffix

        new_keys = list(mapping.values())
        if len(new_keys) != len(set(new_keys)):
            raise HTTPException(409, 'Rename would create duplicate sequence keys')

        q_marks = ','.join(['?'] * len(new_keys))
        conflict_rows = conn.execute(
            f'''SELECT seq_key FROM sequences
                WHERE seq_key IN ({q_marks})''',
            new_keys
        ).fetchall()
        conflicts = [r['seq_key'] for r in conflict_rows if r['seq_key'] not in old_key_set]
        if conflicts:
            raise HTTPException(409, f'Sequence already exists: {conflicts[0]}')

        tmp_prefix = '__tmp_rename_' + hashlib.md5((seq_key + new_root_key).encode('utf-8')).hexdigest()[:12] + '__ '
        tmp_map = {k: tmp_prefix + k for k in old_keys}

        conn.execute('BEGIN')

        # Phase 1: move subtree keys to temporary namespace to avoid UNIQUE collisions.
        for r in subtree:
            old_key = r['seq_key']
            old_parent = r['parent_key']
            tmp_key = tmp_map[old_key]
            tmp_parent = tmp_map[old_parent] if old_parent in old_key_set else old_parent
            conn.execute(
                'UPDATE sequences SET seq_key = ?, parent_key = ? WHERE id = ?',
                [tmp_key, tmp_parent, r['id']]
            )
            conn.execute('UPDATE status SET seq_key = ? WHERE seq_key = ?', [tmp_key, old_key])
            conn.execute('UPDATE comments SET seq_key = ? WHERE seq_key = ?', [tmp_key, old_key])
            conn.execute('UPDATE revisions SET seq_key = ? WHERE seq_key = ?', [tmp_key, old_key])

        # Phase 2: write final keys/parents and update call/section.
        for r in subtree:
            old_key = r['seq_key']
            old_parent = r['parent_key']
            final_key = mapping[old_key]
            final_parent = mapping[old_parent] if old_parent in old_key_set else old_parent
            final_call = new_call if old_key == seq_key else (r['call'] or '')
            final_section = infer_section_from_seq_key(final_key)
            conn.execute(
                '''UPDATE sequences
                   SET seq_key = ?, parent_key = ?, call = ?, section = ?
                   WHERE id = ?''',
                [final_key, final_parent, final_call, final_section, r['id']]
            )
            tmp_key = tmp_map[old_key]
            conn.execute('UPDATE status SET seq_key = ? WHERE seq_key = ?', [final_key, tmp_key])
            conn.execute('UPDATE comments SET seq_key = ? WHERE seq_key = ?', [final_key, tmp_key])
            conn.execute('UPDATE revisions SET seq_key = ? WHERE seq_key = ?', [final_key, tmp_key])

        conn.execute(
            'INSERT INTO revisions (seq_key, field, old_value, new_value) VALUES (?,?,?,?)',
            [new_root_key, 'call', old_call, new_call]
        )
        conn.commit()
        return {'ok': True, 'new_seq_key': new_root_key, 'renamed': len(subtree)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f'Rename failed: {e}')
    finally:
        conn.close()

@app.delete('/api/seq-delete/{seq_key:path}')
def delete_sequence(seq_key: str):
    conn = get_db()
    try:
        subtree = conn.execute(
            '''SELECT seq_key
               FROM sequences
               WHERE seq_key = ? OR seq_key LIKE ?''',
            [seq_key, seq_key + ' %']
        ).fetchall()
        if not subtree:
            raise HTTPException(404, 'Sequence not found')
        keys = [r['seq_key'] for r in subtree]
        marks = ','.join(['?'] * len(keys))

        conn.execute('BEGIN')
        conn.execute(f'DELETE FROM comments WHERE seq_key IN ({marks})', keys)
        conn.execute(f'DELETE FROM status WHERE seq_key IN ({marks})', keys)
        conn.execute(f'DELETE FROM revisions WHERE seq_key IN ({marks})', keys)
        conn.execute(f'DELETE FROM sequences WHERE seq_key IN ({marks})', keys)
        conn.commit()
        return {'ok': True, 'deleted': len(keys)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f'Delete failed: {e}')
    finally:
        conn.close()

@app.post('/api/sequences/{seq_key:path}/comment')
def add_comment(seq_key: str, body: CommentIn):
    conn = get_db()
    # Any new comment means the sequence needs re-review, so reset acceptance.
    conn.execute('INSERT OR REPLACE INTO status (seq_key, accepted, updated_at) VALUES (?,?,?)',
                 [seq_key, 0, datetime.utcnow().isoformat()])
    conn.execute('INSERT INTO comments (seq_key, author, text) VALUES (?,?,?)',
                 [seq_key, body.author, body.text])
    conn.commit(); conn.close()
    return {'ok': True}

@app.put('/api/sequences/{seq_key:path}/status')
def update_status(seq_key: str, body: StatusIn):
    conn = get_db()
    comments_deleted = 0
    if body.accepted:
        row = conn.execute('SELECT COUNT(*) FROM comments WHERE seq_key = ?', [seq_key]).fetchone()
        comments_deleted = row[0] if row else 0
        conn.execute('DELETE FROM comments WHERE seq_key = ?', [seq_key])
    conn.execute('INSERT OR REPLACE INTO status (seq_key, accepted, updated_at) VALUES (?,?,?)',
                 [seq_key, 1 if body.accepted else 0, datetime.utcnow().isoformat()])
    conn.commit(); conn.close()
    return {'ok': True, 'comments_deleted': comments_deleted}

# Safer status endpoint without route conflict with /api/sequences/{seq_key:path}
@app.put('/api/seq-status/{seq_key:path}')
def update_status_alt(seq_key: str, body: StatusIn):
    return update_status(seq_key, body)

@app.get('/api/search')
def search(q: str = ''):
    if not q:
        return []
    conn = get_db()
    rows = conn.execute('''SELECT seq_key, call, notes, forcing, seq_type, alert,
        COALESCE(st.accepted,0) as is_accepted
        FROM sequences s LEFT JOIN status st ON s.seq_key = st.seq_key
        WHERE seq_key LIKE ? OR notes LIKE ? OR forcing LIKE ?
        LIMIT 50''', [f'%{q}%']*3).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get('/api/stats')
def stats():
    conn = get_db()
    total = conn.execute('SELECT COUNT(*) FROM sequences').fetchone()[0]
    accepted = conn.execute('SELECT COUNT(*) FROM status WHERE accepted=1').fetchone()[0]
    commented = conn.execute('''
        SELECT COUNT(DISTINCT c.seq_key)
        FROM comments c
        JOIN sequences s ON s.seq_key = c.seq_key
    ''').fetchone()[0]
    sections = [dict(r) for r in conn.execute(
        'SELECT section, COUNT(*) as cnt FROM sequences GROUP BY section ORDER BY section').fetchall()]
    conn.close()
    return {'total': total, 'accepted': accepted, 'commented': commented, 'sections': sections}

@app.post('/api/import')
def do_import():
    if YAML_SRC.exists():
        n = import_yaml()
        source = str(YAML_SRC)
    elif YAML_SYSTEM_DIR.exists():
        n = import_yaml_system()
        source = str(YAML_SYSTEM_DIR)
    else:
        raise HTTPException(400, detail='Не найден источник YAML (ни k7-standard.yaml, ни папка YAML_system)')
    return {'ok': True, 'imported': n, 'source': source}

@app.get('/api/export')
def do_export():
    conn = get_db()
    rows = conn.execute('SELECT * FROM sequences ORDER BY seq_key').fetchall()
    conn.close()
    out = []
    for r in rows:
        r = dict(r)
        m = json.loads(r['meaning_json'] or '{}')
        if r['notes']: m['notes'] = r['notes']
        if r['forcing']: m['forcing'] = r['forcing']
        if r['seq_type']: m['type'] = r['seq_type']
        if r['alert']: m['alert'] = True
        seq = r['seq_key'].split()
        out.append({'id': r['seq_key'], 'context': {'sequence': seq, 'side': r['side']}, 'meaning': m})
    tmp = BASE / 'k7-export.yaml'
    with open(tmp, 'w', encoding='utf-8') as f:
        yaml.dump(out, f, allow_unicode=True, default_flow_style=False)
    return FileResponse(tmp, filename='k7-standard-export.yaml')

# ── Frontend ──────────────────────────────────────────────────────────────────
HTML = '''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>K7 Editor</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;font-size:14px}
.suit-c{color:#16a34a;font-weight:700}.suit-d{color:#2563eb;font-weight:700}
.suit-h{color:#dc2626;font-weight:700}.suit-s{color:#111827;font-weight:700}
.seq{font-family:'Courier New',monospace;font-size:13px}
header{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;position:sticky;top:0;z-index:100}
header h1{font-size:18px;font-weight:700}
input[type=text],input[type=number]{border:1px solid #cbd5e1;border-radius:8px;padding:6px 12px;font-size:13px;width:200px}
.btn{padding:5px 12px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500}
.btn-blue{background:#dbeafe;color:#1d4ed8}.btn-gray{background:#f1f5f9;color:#475569}
.btn-amber{background:#fef9c3;color:#854d0e}.btn.active{outline:2px solid #3b82f6}
#stats{font-size:13px;color:#64748b;margin-left:auto}
.main{display:flex;gap:16px;padding:16px}
.left{flex:1;min-width:0}.right{width:380px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;position:sticky;top:64px;align-self:flex-start}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.tab{padding:4px 10px;border-radius:6px;background:#f1f5f9;color:#64748b;cursor:pointer;border:none;font-size:12px}
.tab.active{background:#dbeafe;color:#1d4ed8}
.depth-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.depth-label{font-size:11px;color:#94a3b8;text-transform:uppercase}
.depth-chip{padding:3px 10px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;color:#64748b;cursor:pointer;font-size:12px}
.depth-chip.active{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8}
.type-hint{display:none;margin-top:6px;padding:6px 8px;border-radius:8px;background:#eff6ff;color:#1e40af;font-size:12px;line-height:1.35}
.type-hint.warn{background:#fff7ed;color:#9a3412}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}
thead{background:#f8fafc;border-bottom:1px solid #e2e8f0}
th{padding:8px 10px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase}
tr.row{border-bottom:1px solid #f1f5f9;cursor:pointer}
tr.row:hover{background:#f0f9ff}tr.row.sel{background:#eff6ff}tr.row.acc{background:#f0fdf4}
td{padding:7px 10px;font-size:13px}
.tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:9999px;font-weight:600;margin:0 1px}
.gf{background:#dbeafe;color:#1d4ed8}.nf{background:#f1f5f9;color:#475569}
.inv{background:#fef9c3;color:#92400e}.fo{background:#ede9fe;color:#5b21b6}
.fin{background:#fee2e2;color:#991b1b}
.feat{background:#dcfce7;color:#166534}
.loading{text-align:center;padding:40px;color:#94a3b8}
.error-msg{background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px;margin-bottom:10px;display:none}
.pager{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px}
textarea{width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:13px;resize:vertical}
select{border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px}
.det-label{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:4px}
.comment-item{background:#f8fafc;border-radius:8px;padding:8px 10px;margin-bottom:6px}
.comment-meta{font-size:11px;color:#94a3b8;margin-bottom:3px}
.cmt-badge{font-size:12px;opacity:.85;margin-right:4px;vertical-align:middle}
.toggle-wrap{display:inline-flex;align-items:center;gap:4px;min-width:34px;margin-right:2px;color:#64748b}
.child-count{font-size:11px;color:#94a3b8;line-height:1;min-width:12px;text-align:left}
tr.row.row-opener{background:linear-gradient(to right,#f0fdf4,#fff);border-left:3px solid #4ade80}
tr.row.row-responder{background:linear-gradient(to right,#eff6ff,#fff);border-left:3px solid #60a5fa}
tr.row.row-merged{background:#fffbeb !important;border-left:3px solid #fbbf24}
tr.row.row-opener:hover{background:linear-gradient(to right,#dcfce7,#f0f9ff) !important}
tr.row.row-responder:hover{background:linear-gradient(to right,#dbeafe,#f0f9ff) !important}
tr.row.row-merged:hover{background:#fef3c7 !important}
tr.row.acc.row-opener{background:linear-gradient(to right,#dcfce7,#f0fdf4) !important}
tr.row.acc.row-responder{background:linear-gradient(to right,#bfdbfe,#eff6ff) !important}
tr.row.sel{background:#dbeafe !important}
tr.row.sel.row-opener{background:linear-gradient(to right,#cdebd8,#dbeafe) !important}
tr.row.sel.row-responder{background:linear-gradient(to right,#cfe2ff,#dbeafe) !important}
tr.row.sel.row-merged{background:#fde68a !important}
tr.row.sel td:first-child{box-shadow:inset 4px 0 0 #2563eb}
tr.row.sel .seq{font-weight:700}
.modal{position:fixed;inset:0;background:rgba(2,6,23,.35);display:none;align-items:center;justify-content:center;z-index:200}
.modal.show{display:flex}
.modal-card{width:min(680px,96vw);max-height:90vh;overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.shape-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
.shape-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.shape-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.shape-field label{font-size:11px;color:#64748b}
.shape-row .shape-field{flex:1;min-width:150px}
.shape-field input,.shape-field select,.shape-field textarea{width:100%;max-width:100%}
@media (max-width: 1360px){.shape-grid{grid-template-columns:1fr}}
.modal .field{display:flex;flex-direction:column;gap:4px}
.modal .field label{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600}
</style>
</head>
<body>

<header>
  <h1>&#x1F0A0; K7 Editor</h1>
  <input id="search" type="text" placeholder="Поиск..." oninput="doSearch(this.value)">
  <button onclick="setFilter('')" id="f-all" class="btn btn-blue active">Все</button>
  <button onclick="setFilter('1')" id="f-acc" class="btn btn-gray">✅ Принято</button>
  <button onclick="setFilter('0')" id="f-rej" class="btn btn-gray">❌ Не принято</button>
  <button onclick="setFilter('c')" id="f-cmt" class="btn btn-gray">💬 Комментарии</button>
  <button onclick="openCreateModal('')" class="btn btn-gray">➕ Корневая</button>
  <div id="stats"></div>
  <button onclick="doImport()" class="btn btn-amber">↻ Импорт YAML</button>
  <button onclick="doExport()" class="btn btn-amber">↧ Экспорт YAML</button>
</header>

<div class="main">
  <div class="left" id="tree-panel">
    <div id="section-tabs" class="tabs"></div>
    <div id="depth-chips" class="depth-chips"></div>
    <div id="err-box" class="error-msg"></div>
    <table id="seq-table">
      <thead><tr>
        <th style="width:30px"></th>
        <th>Последовательность</th>
        <th style="width:70px">HCP</th>
        <th style="width:110px">Тип</th>
        <th>Описание</th>
        <th style="width:70px;text-align:center">Принято</th>
      </tr></thead>
      <tbody id="seq-body"><tr><td colspan="6" class="loading">Загрузка...</td></tr></tbody>
    </table>
    <div id="pager" class="pager"></div>
  </div>
  <div class="right" id="detail" style="display:none">
    <div id="detail-content"></div>
  </div>
</div>

<div id="create-modal" class="modal" onclick="closeCreateModal()">
  <div class="modal-card" onclick="event.stopPropagation()">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:16px;font-weight:700">Новая секвенция</div>
      <button onclick="closeCreateModal()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#94a3b8">×</button>
    </div>
    <div class="field" style="margin-bottom:8px">
      <label>Родитель</label>
      <input id="create-parent" type="text" readonly>
    </div>
    <div class="grid2">
      <div class="field">
        <label>Заявка (call)</label>
        <input id="create-call" type="text" placeholder="напр. 2H или 3NT">
      </div>
      <div class="field">
        <label>Forcing</label>
        <select id="create-forcing" onchange="syncTypeForcing('create','forcing')">
          <option value="">—</option>
          <option value="1RF">1RF</option>
          <option value="GF">GF</option>
          <option value="INV">INV</option>
          <option value="NF">NF</option>
          <option value="SINV">SINV (шлем-инвит)</option>
          <option value="STRY">STRY (шлем-попытка)</option>
        </select>
      </div>
      <div class="field">
        <label>HCP min</label>
        <input id="create-hcp-min" type="number" min="0" max="37" step="1" placeholder="например 10">
      </div>
      <div class="field">
        <label>HCP max</label>
        <input id="create-hcp-max" type="number" min="0" max="37" step="1" placeholder="например 12">
      </div>
      <div class="field">
        <label>Тип</label>
        <select id="create-type" onchange="syncTypeForcing('create','type')">
          <option value="">—</option>
          <option value="ask">ask</option>
          <option value="convention">convention</option>
          <option value="cuebid">cuebid</option>
          <option value="feature">feature</option>
          <option value="game">game</option>
          <option value="natural">natural</option>
          <option value="preempt">preempt</option>
          <option value="relay">relay</option>
          <option value="sign-off">sign-off</option>
          <option value="splinter">splinter</option>
          <option value="transfer">transfer</option>
        </select>
      </div>
      <div class="field">
        <label>Natural</label>
        <select id="create-natural">
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    </div>
    <div id="create-type-hint" class="type-hint"></div>
    <div class="field" style="margin-top:8px">
      <label>Notes</label>
      <textarea id="create-notes" rows="3" placeholder="Краткое описание заявки"></textarea>
    </div>
    <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
      <label><input id="create-alert" type="checkbox"> Alert</label>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button onclick="closeCreateModal()" class="btn btn-gray">Отмена</button>
        <button onclick="submitCreate(this)" class="btn btn-blue">Создать</button>
      </div>
    </div>
  </div>
</div>

<div id="accept-modal" class="modal" onclick="resolveAccept(false)">
  <div class="modal-card" style="max-width:460px" onclick="event.stopPropagation()">
    <div style="font-size:16px;font-weight:700;margin-bottom:8px">Подтвердите принятие</div>
    <div style="font-size:13px;color:#475569;line-height:1.45">
      Вы уверены, что заявка принимается в систему?
      <br>Все комментарии по этой заявке будут удалены.
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
      <button class="btn btn-gray" onclick="resolveAccept(false)">Нет</button>
      <button class="btn btn-blue" onclick="resolveAccept(true)">Да</button>
    </div>
  </div>
</div>

<script>
'use strict';
let allRows = [], curFilter = '', curSection = '', curSearch = '', selKey = null;
let page = 0, pageSize = 100;
let curDepth = 0;
let collapsedKeys = new Set();
let parentKeys = new Set();
let childCountByParent = new Map();
let createParentKey = '';
let acceptResolve = null;

function showError(msg) {
  let el = document.getElementById('err-box');
  if (!el) { el = document.createElement('div'); el.id='err-box'; el.className='error-msg'; document.querySelector('.left').prepend(el); }
  el.textContent = '⚠️ ' + msg; el.style.display='block';
  console.error(msg);
}
function clearError() { const el = document.getElementById('err-box'); if(el) el.style.display='none'; }

function parseHcpInput(raw, label) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^\\d+$/.test(s)) {
    throw new Error(label + ': только целые числа от 0 до 37');
  }
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0 || n > 37) {
    throw new Error(label + ': допустимый диапазон 0..37');
  }
  return n;
}

function askAcceptConfirm() {
  return new Promise(function(resolve) {
    acceptResolve = resolve;
    document.getElementById('accept-modal').classList.add('show');
  });
}

function resolveAccept(val) {
  document.getElementById('accept-modal').classList.remove('show');
  if (acceptResolve) {
    const fn = acceptResolve;
    acceptResolve = null;
    fn(!!val);
  }
}

function parseBidToken(tok) {
  const raw = String(tok || '').trim();
  if (!raw) return [9, 0, 0, ''];
  const t = raw.toUpperCase().replace(/БК/g, 'NT');
  if (t === 'PASS' || t === 'P') return [1, 0, 0, 'PASS'];
  if (t === 'X' || t === 'DBL') return [2, 0, 0, 'X'];
  if (t === 'XX' || t === 'RDBL') return [3, 0, 0, 'XX'];
  const m = t.match(/^([1-7])(NT|C|D|H|S|♣|♦|♥|♠)$/);
  if (m) {
    const level = Number(m[1]);
    const suitMap = {C:0, '♣':0, D:1, '♦':1, H:2, '♥':2, S:3, '♠':3, NT:4};
    const suit = suitMap[m[2]] ?? 9;
    return [0, level, suit, ''];
  }
  return [8, 0, 0, t];
}

function compareSeqKeys(a, b) {
  const aa = String(a || '').split(' ').filter(Boolean).map(parseBidToken);
  const bb = String(b || '').split(' ').filter(Boolean).map(parseBidToken);
  const n = Math.min(aa.length, bb.length);
  for (let i = 0; i < n; i++) {
    const ta = aa[i], tb = bb[i];
    for (let j = 0; j < 3; j++) {
      if (ta[j] !== tb[j]) return ta[j] - tb[j];
    }
    if (ta[3] !== tb[3]) return ta[3].localeCompare(tb[3], 'ru');
  }
  if (aa.length !== bb.length) return aa.length - bb.length;
  return String(a || '').localeCompare(String(b || ''), 'ru');
}

async function loadStats() {
  try {
    const r = await fetch('/api/stats');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    document.getElementById('stats').textContent = d.accepted + '/' + d.total + ' принято';
    const tabs = document.getElementById('section-tabs');
    let html = '<button onclick="setSection(event,\\'\\')" class="tab active">Все</button> ';
    for (const s of d.sections) {
      html += '<button onclick="setSection(event,\\'' + s.section + '\\')" class="tab">' + sectionLabel(s.section) + ' <span style="opacity:.5">' + s.cnt + '</span></button> ';
    }
    tabs.innerHTML = html;
  } catch(e) { showError('Ошибка загрузки статистики: ' + e.message); }
}

function sectionLabel(s) {
  const m = { responses_1C:'1♣', responses_1D:'1♦', responses_1H:'1♥', responses_1S:'1♠',
    responses_1nt:'1БК', responses_2C:'2♣', responses_2D:'2♦', responses_2H:'2♥',
    responses_2S:'2♠', responses_2NT:'2БК', competitive:'Конкурентка',
    slam_bidding:'Слем', signals:'Сигналы', conventions_index:'Конвенции',
    gazilli_tree:'Газилли' };
  return m[s] || s;
}

async function loadRows() {
  const tb = document.getElementById('seq-body');
  tb.innerHTML = '<tr><td colspan="6" class="loading">Загрузка...</td></tr>';
  clearError();
  try {
    const acceptedParam = (curFilter === '1' || curFilter === '0') ? curFilter : '';
    const commentedParam = (curFilter === 'c') ? '1' : '';
    const url = '/api/sequences?section=' + encodeURIComponent(curSection) +
      '&search=' + encodeURIComponent(curSearch) +
      '&accepted=' + acceptedParam +
      '&commented=' + commentedParam;
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    allRows = await r.json();
    if (!curSearch.trim()) {
      allRows.sort(function(a, b){ return compareSeqKeys(a.seq_key, b.seq_key); });
    }
    buildParentSet(allRows);
    renderDepthControls();
    collapsedKeys.clear();
    page = 0;
    renderTable();
  } catch(e) {
    showError('Ошибка загрузки данных: ' + e.message);
    tb.innerHTML = '<tr><td colspan="6" class="loading">Ошибка загрузки</td></tr>';
  }
}

function suitify(s) {
  const withSuits = String(s || '')
    .split(' ')
    .map(function(tok) {
      return tok
        .replace(/^([1-7])C$/i, '$1♣')
        .replace(/^([1-7])D$/i, '$1♦')
        .replace(/^([1-7])H$/i, '$1♥')
        .replace(/^([1-7])S$/i, '$1♠');
    })
    .join(' ');
  return withSuits.replace(/♣/g,'<span class="suit-c">♣</span>')
          .replace(/♦/g,'<span class="suit-d">♦</span>')
          .replace(/♥/g,'<span class="suit-h">♥</span>')
          .replace(/♠/g,'<span class="suit-s">♠</span>');
}

function forcingTag(f) {
  if (!f) return '';
  const cls = {GF:'gf', NF:'nf', '1RF':'fo', INV:'inv', SINV:'inv', STRY:'fo'}[f] || 'nf';
  return '<span class="tag ' + cls + '">' + f + '</span>';
}

function typeTag(t) {
  if (!t || t==='section' || t==='unknown') return '';
  const cls = {natural:'nf','sign-off':'fin',cuebid:'fo',relay:'fo',ask:'fo',transfer:'fo',splinter:'fo',feature:'feat',preempt:'fin',convention:'fo',game:'gf'}[t] || 'nf';
  const labels = {natural:'натурально','sign-off':'финал',cuebid:'кюбид',relay:'реле',ask:'вопрос',transfer:'трансфер',splinter:'сплинтер',feature:'feature',preempt:'блок',convention:'конв',game:'гейм','negative-double':'нег.X'};
  return '<span class="tag ' + cls + '">' + (labels[t]||t) + '</span>';
}

const FORCING_VALUES = ['1RF','GF','INV','NF','SINV','STRY'];
const TYPE_VALUES = ['ask','convention','cuebid','feature','game','natural','preempt','relay','sign-off','splinter','transfer'];
const TYPE_FORCING_MAP = {
  natural: ['NF','INV','GF','1RF','SINV','STRY'],
  'sign-off': ['NF'],
  cuebid: ['GF','SINV','STRY','1RF'],
  relay: ['1RF'],
  ask: ['1RF'],
  transfer: ['1RF'],
  splinter: ['1RF'],
  feature: ['1RF'],
  preempt: ['NF'],
  convention: ['1RF'],
  game: ['NF'],
};

function sortedAlpha(values) {
  return (values || []).slice().sort(function(a, b){ return String(a).localeCompare(String(b), 'en'); });
}

function getAllowedForcingByType(t) {
  return TYPE_FORCING_MAP[t] ? TYPE_FORCING_MAP[t].slice() : FORCING_VALUES.slice();
}

function getAllowedTypesByForcing(f) {
  if (!f) return TYPE_VALUES.slice();
  return TYPE_VALUES.filter(function(t){
    const allowed = TYPE_FORCING_MAP[t] || FORCING_VALUES;
    return allowed.includes(f);
  });
}

function setSelectOptions(sel, options, selectedValue, placeholder) {
  if (!sel) return '';
  const opts = sortedAlpha(options);
  let html = '<option value="">' + placeholder + '</option>';
  for (const v of opts) {
    html += '<option value="' + v + '">' + v + '</option>';
  }
  sel.innerHTML = html;
  const value = opts.includes(selectedValue) ? selectedValue : '';
  sel.value = value;
  return value;
}

function typeLabelRu(t) {
  const labels = {
    'natural': 'натурально',
    'sign-off': 'финал',
    'cuebid': 'кюбид',
    'relay': 'реле',
    'ask': 'вопрос',
    'transfer': 'трансфер',
    'splinter': 'сплинтер',
    'feature': 'feature',
    'preempt': 'блок',
    'convention': 'конвенция',
    'game': 'гейм',
  };
  return labels[t] || t;
}

function syncTypeForcing(scope, source) {
  const typeEl = document.getElementById(scope + '-type');
  const forcingEl = document.getElementById(scope + '-forcing');
  if (!typeEl || !forcingEl) return;

  let t = String(typeEl.value || '');
  let f = String(forcingEl.value || '');

  if (source === 'type' && t) {
    const allowed = getAllowedForcingByType(t);
    if (f && !allowed.includes(f)) f = '';
  } else if (source === 'forcing' && f) {
    const allowed = getAllowedTypesByForcing(f);
    if (t && !allowed.includes(t)) t = '';
  }

  const allowedTypes = f ? getAllowedTypesByForcing(f) : TYPE_VALUES;
  t = setSelectOptions(typeEl, allowedTypes, t, 'Тип?');

  const allowedForcing = t ? getAllowedForcingByType(t) : FORCING_VALUES;
  f = setSelectOptions(forcingEl, allowedForcing, f, 'Forcing?');

  updateTypeHint(scope);
}

function updateTypeHint(scope) {
  const typeEl = document.getElementById(scope + '-type');
  const forcingEl = document.getElementById(scope + '-forcing');
  const hintEl = document.getElementById(scope + '-type-hint');
  if (!typeEl || !forcingEl || !hintEl) return;

  const t = String(typeEl.value || '');
  const f = String(forcingEl.value || '');
  if (!t && !f) {
    hintEl.style.display = 'none';
    hintEl.textContent = '';
    hintEl.classList.remove('warn');
    return;
  }

  let text = '';
  let warn = false;
  if (t) {
    const allowedF = getAllowedForcingByType(t);
    const typeRu = typeLabelRu(t);
    if (!f) {
      text = 'Для типа "' + typeRu + '" допустимые forcing: ' + allowedF.join('/');
    } else if (!allowedF.includes(f)) {
      text = 'Внимание: forcing "' + f + '" не соответствует типу "' + typeRu + '". Допустимо: ' + allowedF.join('/');
      warn = true;
    } else {
      text = 'Тип "' + typeRu + '" согласован с forcing "' + f + '".';
    }
  } else {
    const allowedT = getAllowedTypesByForcing(f);
    text = 'Для forcing "' + f + '" допустимые типы: ' + allowedT.join(', ');
  }

  hintEl.textContent = text;
  hintEl.style.display = 'block';
  hintEl.classList.toggle('warn', warn);
}

function buildParentSet(rows) {
  parentKeys.clear();
  childCountByParent.clear();
  for (const r of rows) {
    if (r.parent_key) parentKeys.add(r.parent_key);
    const parts = String(r.seq_key || '').split(' ').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join(' ');
      childCountByParent.set(ancestor, (childCountByParent.get(ancestor) || 0) + 1);
    }
  }
}

function maxDepthInRows() {
  let maxDepth = 0;
  for (const r of allRows) {
    const d = String(r.seq_key || '').split(' ').filter(Boolean).length;
    if (d > maxDepth) maxDepth = d;
  }
  return maxDepth;
}

function renderDepthControls() {
  const box = document.getElementById('depth-chips');
  if (!box) return;
  const maxDepth = maxDepthInRows();
  if (curDepth > maxDepth) curDepth = 0;
  let html = '<span class="depth-label">Глубина</span>';
  html += '<button class="depth-chip' + (curDepth === 0 ? ' active' : '') + '" onclick="setDepth(0)">Все</button>';
  for (let d = 1; d <= maxDepth; d++) {
    html += '<button class="depth-chip' + (curDepth === d ? ' active' : '') + '" onclick="setDepth(' + d + ')">' + d + '</button>';
  }
  box.innerHTML = html;
}

function setDepth(d) {
  curDepth = Number(d) || 0;
  page = 0;
  if (selKey) {
    const selRow = allRows.find(function(r){ return r.seq_key === selKey; });
    if (selRow && !isVisible(selRow)) {
      document.getElementById('detail').style.display = 'none';
      selKey = null;
    }
  }
  renderDepthControls();
  renderTable();
}

function moveToSequencePage(seqKey) {
  const visibleRows = allRows.filter(isVisible);
  const idx = visibleRows.findIndex(function(r){ return (r.seq_key || '') === (seqKey || ''); });
  if (idx >= 0) page = Math.floor(idx / pageSize);
}

function updateFilterButtons() {
  document.querySelectorAll('.btn').forEach(function(b){
    if (b.id==='f-all'||b.id==='f-acc'||b.id==='f-rej'||b.id==='f-cmt') {
      b.classList.remove('active','btn-blue');
      b.classList.add('btn-gray');
    }
  });
  const ids = {'':'f-all','1':'f-acc','0':'f-rej','c':'f-cmt'};
  const btn = document.getElementById(ids[curFilter]);
  if (btn) {
    btn.classList.remove('btn-gray');
    btn.classList.add('btn-blue','active');
  }
}

function resetViewForCreatedSequence() {
  curSearch = '';
  curFilter = '';
  curSection = '';
  curDepth = 0;
  const searchEl = document.getElementById('search');
  if (searchEl) searchEl.value = '';
  updateFilterButtons();
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(function(b){ b.classList.remove('active'); });
  if (tabs.length) tabs[0].classList.add('active');
}

function isVisible(row) {
  const parts = (row.seq_key || '').split(' ').filter(Boolean);
  if (curDepth > 0 && parts.length > curDepth) return false;
  for (let i = 1; i < parts.length; i++) {
    const ancestor = parts.slice(0, i).join(' ');
    if (collapsedKeys.has(ancestor)) return false;
  }
  return true;
}

function toggleCollapse(ev, key) {
  ev.stopPropagation();
  if (collapsedKeys.has(key)) {
    collapsedKeys.delete(key);
  } else {
    // If a depth filter is active, expanding a node should reveal at least its children.
    const keyDepth = String(key || '').split(' ').filter(Boolean).length;
    const minDepthToShowChildren = keyDepth + 1;
    if (curDepth > 0 && curDepth < minDepthToShowChildren) {
      curDepth = minDepthToShowChildren;
      renderDepthControls();
    }
    collapsedKeys.add(key);
  }
  page = 0;
  renderTable();
}

function renderTable() {
  const tb = document.getElementById('seq-body');
  if (!allRows.length) {
    tb.innerHTML = '<tr><td colspan="6" class="loading">Нет данных</td></tr>';
    renderPager(0);
    return;
  }
  const visibleRows = allRows.filter(isVisible);
  const start = page * pageSize;
  const slice = visibleRows.slice(start, start + pageSize);
  let html = '';
  for (const r of slice) {
    try {
      const depth = r.seq_key ? r.seq_key.split(' ').length - 1 : 0;
      const indent = depth > 0 ? 'padding-left:' + (depth * 14) + 'px' : '';
      const accepted = r.is_accepted;
      const alert = r.alert ? ' ⚠️' : '';
      const hcp = r.hcp_min != null ? (r.hcp_max ? r.hcp_min + '–' + r.hcp_max : r.hcp_min + '+') : '';
      const escapedKey = (r.seq_key || '').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\'");
      const commentsCount = Number(r.comments_count || 0);
      const isMerged = (r.seq_key || '').includes('/');
      const inferredSide = (depth % 2 === 0) ? 'opener' : 'responder';
      const effectiveSide = r.side || inferredSide;
      const sideClass = isMerged ? ' row-merged' : (effectiveSide === 'opener' ? ' row-opener' : ' row-responder');
      html += '<tr class="row' + (accepted?' acc':'') + (selKey===r.seq_key?' sel':'') + sideClass + '" onclick="selectRow(\\'' + escapedKey + '\\')">';
      const hasChildren = parentKeys.has(r.seq_key);
      const isCollapsed = collapsedKeys.has(r.seq_key);
      const childCount = Number(childCountByParent.get(r.seq_key) || 0);
      const toggleIcon = hasChildren
        ? '<span class="toggle-wrap"><span onclick="toggleCollapse(event,\\'' + escapedKey + '\\')" style="cursor:pointer;display:inline-block;width:16px;text-align:center;font-size:10px;vertical-align:middle">' + (isCollapsed ? '▶' : '▼') + '</span><span class="child-count">' + childCount + '</span></span>'
        : '<span style="display:inline-block;width:16px"></span>';
      const leftMark = accepted
        ? '✅'
        : ((commentsCount > 0) ? '<span class="cmt-badge" title="Комментарии: ' + commentsCount + '">💬</span>' : '·');
      html += '<td style="text-align:center;width:30px">' + leftMark + '</td>';
      html += '<td class="seq" style="' + indent + '">' + toggleIcon + suitify(r.seq_key || '') + alert + '</td>';
      html += '<td style="color:#94a3b8;font-size:12px;white-space:nowrap">' + hcp + '</td>';
      html += '<td>' + forcingTag(r.forcing) + ' ' + typeTag(r.seq_type) + '</td>';
      html += '<td style="color:#475569;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (r.notes || '') + '</td>';
      html += '<td style="text-align:center"><input type="checkbox"' + (accepted ? ' checked' : '') + ' onclick="toggleAccepted(event,\\'' + escapedKey + '\\',this)"></td>';
      html += '</tr>';
    } catch(e) { console.error('Row render error:', r, e); }
  }
  tb.innerHTML = html || '<tr><td colspan="6" class="loading">Нет данных</td></tr>';
  renderPager(visibleRows.length);
}

function renderPager(total) {
  if (total === undefined) total = allRows.length;
  const pages = Math.ceil(total / pageSize);
  const pager = document.getElementById('pager');
  if (!pager) return;
  if (pages <= 1) { pager.innerHTML = '<span style="color:#94a3b8">Всего: ' + total + '</span>'; return; }
  let html = '<span style="color:#94a3b8">Всего: ' + total + ' | Стр. ' + (page+1) + '/' + pages + '</span> ';
  if (page > 0) html += '<button class="btn btn-gray" onclick="goPage(' + (page-1) + ')">← Пред</button> ';
  if (page < pages-1) html += '<button class="btn btn-gray" onclick="goPage(' + (page+1) + ')">След →</button>';
  pager.innerHTML = html;
}

function goPage(p) { page = p; renderTable(); window.scrollTo(0,0); }

async function selectRow(key) {
  selKey = key;
  renderTable();
  try {
    const r = await fetch('/api/sequences/' + encodeURIComponent(key));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const hcp = d.hcp_min != null ? (d.hcp_max ? d.hcp_min + '–' + d.hcp_max + ' HCP' : d.hcp_min + '+ HCP') : '';
    const ek = key.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\'");
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const meaning = (d.meaning && typeof d.meaning === 'object') ? d.meaning : {};
    const shape = (meaning.shape && typeof meaning.shape === 'object') ? meaning.shape : {};
    const shapeSpades = shape.spades ?? '';
    const shapeHearts = shape.hearts ?? '';
    const shapeDiamonds = shape.diamonds ?? '';
    const shapeClubs = shape.clubs ?? '';
    const shapeBalanced = shape.balanced === true ? 'true' : (shape.balanced === false ? 'false' : '');
    const shapePatterns = Array.isArray(shape.patterns) ? shape.patterns.join(', ') : '';
    const shapeConstraints = Array.isArray(shape.constraints) ? shape.constraints.join('\\n') : '';
    const showsText = Array.isArray(meaning.shows) ? meaning.shows.join('\\n') : '';
    const balSelEmpty = shapeBalanced === '' ? ' selected' : '';
    const balSelTrue = shapeBalanced === 'true' ? ' selected' : '';
    const balSelFalse = shapeBalanced === 'false' ? ' selected' : '';

    const sortedChildren = (d.children || []).slice().sort(function(a, b) {
      const aKey = a.seq_key || ((d.seq_key || '') + ' ' + (a.call || ''));
      const bKey = b.seq_key || ((d.seq_key || '') + ' ' + (b.call || ''));
      return compareSeqKeys(aKey, bKey);
    });

    let childHtml = '';
    if (sortedChildren.length) {
      childHtml = '<div class="det-label" style="margin-top:12px">Продолжения (' + sortedChildren.length + ')</div>';
      for (const c of sortedChildren.slice(0,15)) {
        const eck = (c.seq_key||'').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\'");
        const cComments = Number(c.comments_count || 0);
        const cAccepted = Number(c.is_accepted || 0);
        const cIcon = (cComments > 0 && !cAccepted) ? ' <span class="cmt-badge" title="Комментарии: ' + cComments + '">💬</span>' : '';
        const cHcp = c.hcp_min != null ? (c.hcp_max != null ? (c.hcp_min + '–' + c.hcp_max + ' HCP') : (c.hcp_min + '+ HCP')) : '';
        const cShows = Array.isArray(c.shows) ? c.shows : [];
        const cShowsText = cShows.join('; ');
        const cDesc = cShowsText || (c.notes || '');
        childHtml += '<div style="background:#f8fafc;border-radius:6px;padding:5px 8px;margin-bottom:4px;cursor:pointer;font-size:12px" onclick="selectRow(\\'' + eck + '\\')">';
        childHtml += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
        childHtml += '<span class="seq" style="font-weight:600">' + cIcon + suitify(c.call||'') + '</span>';
        if (cHcp) childHtml += '<span style="font-size:11px;color:#94a3b8">' + cHcp + '</span>';
        childHtml += forcingTag(c.forcing);
        childHtml += '</div>';
        if (cDesc) childHtml += '<div style="color:#64748b;margin-top:2px;font-size:12px;line-height:1.3">' + esc(cDesc) + '</div>';
        childHtml += '</div>';
      }
      if (sortedChildren.length > 15) childHtml += '<div style="font-size:11px;color:#94a3b8">...ещё ' + (sortedChildren.length-15) + '</div>';
    }

    let commHtml = '<div class="det-label" style="margin-top:12px">Комментарии (' + (d.comments||[]).length + ')</div>';
    for (const c of (d.comments||[])) {
      commHtml += '<div class="comment-item"><div class="comment-meta">' + c.author + ' · ' + (c.created_at||'').slice(0,16) + '</div>' + c.text + '</div>';
    }
    commHtml += '<div style="display:flex;gap:6px;margin-top:6px">';
    commHtml += '<input type="text" id="new-comment" placeholder="Комментарий..." style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;font-size:13px">';
    commHtml += '<button onclick="addComment(\\'' + ek + '\\',this)" class="btn btn-gray">+</button></div>';

    document.getElementById('detail').style.display = 'block';
    document.getElementById('detail-content').innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
        '<div class="seq" style="font-size:16px;font-weight:700">' + suitify(d.seq_key||'') + '</div>' +
        '<button onclick="closeDetail()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#94a3b8">×</button>' +
      '</div>' +
      '<div style="font-size:11px;color:#94a3b8;margin-bottom:10px">' + (d.section||'') + ' · ' + (d.side||'') + (hcp ? ' · ' + hcp : '') + '</div>' +
      '<div class="det-label">Заявка (call)</div>' +
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">' +
        '<input id="edit-call" type="text" maxlength="20" value="' + esc(d.call || '') + '" style="width:120px">' +
        '<button onclick="renameSequence(\\'' + ek + '\\',this)" class="btn btn-gray">✏️ Переименовать</button>' +
        '<button onclick="deleteSequence(\\'' + ek + '\\',this)" class="btn btn-gray" style="color:#991b1b">🗑 Удалить</button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<button onclick="openCreateModal(\\'' + ek + '\\')" class="btn btn-gray">+ Продолжение</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;background:#f8fafc;padding:10px;border-radius:8px;margin-bottom:12px">' +
        '<input type="checkbox" id="det-accepted"' + (d.is_accepted?' checked':'') + ' onchange="toggleAcceptedDetail(\\'' + ek + '\\',this)">' +
        '<label for="det-accepted" style="font-weight:500;cursor:pointer">Принято в систему</label>' +
      '</div>' +
      '<div class="det-label">Shows</div>' +
      '<textarea id="edit-shows" rows="3" placeholder="По одной строке: что заявка показывает">' + esc(showsText) + '</textarea>' +
      '<div class="det-label">Описание</div>' +
      '<textarea id="edit-notes" rows="3">' + esc(d.notes||'') + '</textarea>' +
      '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">' +
        '<input id="edit-hcp-min" type="number" min="0" max="37" step="1" placeholder="HCP min" style="width:92px" value="' + (d.hcp_min ?? '') + '">' +
        '<input id="edit-hcp-max" type="number" min="0" max="37" step="1" placeholder="HCP max" style="width:92px" value="' + (d.hcp_max ?? '') + '">' +
        '<select id="edit-forcing" onchange="syncTypeForcing(\\'edit\\',\\'forcing\\')"><option value="">Forcing?</option>' +
          sortedAlpha(FORCING_VALUES).map(v => '<option' + (d.forcing===v?' selected':'') + ' value="' + v + '">' + v + '</option>').join('') +
        '</select>' +
        '<select id="edit-type" onchange="syncTypeForcing(\\'edit\\',\\'type\\')"><option value="">Тип?</option>' +
          sortedAlpha(TYPE_VALUES).map(v => '<option' + (d.seq_type===v?' selected':'') + ' value="' + v + '">' + v + '</option>').join('') +
        '</select>' +
        '<label><input type="checkbox" id="edit-alert"' + (d.alert?' checked':'') + '> Alert</label>' +
      '</div>' +
      '<div id="edit-type-hint" class="type-hint"></div>' +
      '<div class="det-label" style="margin-top:10px">Shape</div>' +
      '<div class="shape-grid">' +
        '<div class="shape-field">' +
          '<label><span class="suit-s">♠</span> Пики</label>' +
          '<input id="edit-shape-spades" type="text" placeholder="напр. 0-4" value="' + esc(shapeSpades) + '">' +
        '</div>' +
        '<div class="shape-field">' +
          '<label><span class="suit-h">♥</span> Червы</label>' +
          '<input id="edit-shape-hearts" type="text" placeholder="напр. 0-4" value="' + esc(shapeHearts) + '">' +
        '</div>' +
        '<div class="shape-field">' +
          '<label><span class="suit-d">♦</span> Бубны</label>' +
          '<input id="edit-shape-diamonds" type="text" placeholder="напр. 4+" value="' + esc(shapeDiamonds) + '">' +
        '</div>' +
        '<div class="shape-field">' +
          '<label><span class="suit-c">♣</span> Трефы</label>' +
          '<input id="edit-shape-clubs" type="text" placeholder="напр. 2+" value="' + esc(shapeClubs) + '">' +
        '</div>' +
      '</div>' +
      '<div class="shape-row">' +
        '<div class="shape-field" style="max-width:180px">' +
          '<label>Balanced</label>' +
          '<select id="edit-shape-balanced">' +
            '<option value=""' + balSelEmpty + '>null</option>' +
            '<option value="true"' + balSelTrue + '>true</option>' +
            '<option value="false"' + balSelFalse + '>false</option>' +
          '</select>' +
        '</div>' +
        '<div class="shape-field">' +
          '<label>Patterns (через запятую)</label>' +
          '<input id="edit-shape-patterns" type="text" placeholder="4432, 4441" value="' + esc(shapePatterns) + '">' +
        '</div>' +
      '</div>' +
      '<div class="shape-field" style="margin-top:6px">' +
        '<label>Constraints (по одной строке)</label>' +
        '<textarea id="edit-shape-constraints" rows="3" placeholder="Ограничения формы">' + esc(shapeConstraints) + '</textarea>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:8px">' +
        '<button onclick="saveEdit(\\'' + ek + '\\',this)" class="btn btn-blue">💾 Сохранить</button>' +
      '</div>' +
      childHtml + commHtml;
    setTimeout(function(){
      const rowEl = document.querySelector('tr.row.sel');
      if (rowEl && rowEl.scrollIntoView) {
        rowEl.scrollIntoView({block:'nearest'});
      }
    }, 0);
    syncTypeForcing('edit', 'init');
  } catch(e) { showError('Ошибка загрузки записи: ' + e.message); }
}

function closeDetail() {
  document.getElementById('detail').style.display = 'none';
  selKey = null;
  renderTable();
}

async function renameSequence(oldKey, btn) {
  const inp = document.getElementById('edit-call');
  const newCall = (inp?.value || '').trim();
  if (!newCall) {
    showError('Введите новую заявку (call)');
    return;
  }
  if (!confirm('Переименовать заявку?\\nВсе дочерние продолжения будут автоматически обновлены.')) return;
  const prev = btn.textContent;
  try {
    btn.disabled = true;
    btn.textContent = 'Переименовываю...';
    const r = await fetch('/api/seq-rename/' + encodeURIComponent(oldKey), {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({new_call: newCall})
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error('HTTP ' + r.status + ' ' + txt);
    }
    const d = await r.json();
    const newKey = d.new_seq_key || oldKey;
    await loadRows();
    if (!allRows.find(function(x){ return x.seq_key === newKey; })) {
      resetViewForCreatedSequence();
      await loadRows();
    }
    moveToSequencePage(newKey);
    await selectRow(newKey);
    await loadStats();
  } catch(e) {
    showError('Ошибка переименования: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
}

async function deleteSequence(key, btn) {
  if (!confirm('Удалить секвенцию и все её продолжения?\\nЭто действие нельзя отменить.')) return;
  const prev = btn.textContent;
  try {
    btn.disabled = true;
    btn.textContent = 'Удаляю...';
    const r = await fetch('/api/seq-delete/' + encodeURIComponent(key), { method: 'DELETE' });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error('HTTP ' + r.status + ' ' + txt);
    }
    const d = await r.json();
    closeDetail();
    await loadRows();
    await loadStats();
    alert('Удалено секвенций: ' + (d.deleted || 0));
  } catch(e) {
    showError('Ошибка удаления: ' + e.message);
    btn.disabled = false;
    btn.textContent = prev;
  }
}

async function saveEdit(key, btn) {
  try {
    const hcpMinRaw = document.getElementById('edit-hcp-min').value.trim();
    const hcpMaxRaw = document.getElementById('edit-hcp-max').value.trim();
    const hcpMinVal = parseHcpInput(hcpMinRaw, 'HCP min');
    const hcpMaxVal = parseHcpInput(hcpMaxRaw, 'HCP max');
    const showsRaw = (document.getElementById('edit-shows')?.value || '').trim();
    const shapeSpadesRaw = (document.getElementById('edit-shape-spades')?.value || '').trim();
    const shapeHeartsRaw = (document.getElementById('edit-shape-hearts')?.value || '').trim();
    const shapeDiamondsRaw = (document.getElementById('edit-shape-diamonds')?.value || '').trim();
    const shapeClubsRaw = (document.getElementById('edit-shape-clubs')?.value || '').trim();
    const shapeBalancedRaw = (document.getElementById('edit-shape-balanced')?.value || '').trim();
    const shapePatternsRaw = (document.getElementById('edit-shape-patterns')?.value || '').trim();
    const shapeConstraintsRaw = (document.getElementById('edit-shape-constraints')?.value || '').trim();
    const shapeObj = {
      spades: shapeSpadesRaw || 'any',
      hearts: shapeHeartsRaw || 'any',
      diamonds: shapeDiamondsRaw || 'any',
      clubs: shapeClubsRaw || 'any',
      balanced: shapeBalancedRaw === '' ? null : (shapeBalancedRaw === 'true'),
      patterns: shapePatternsRaw ? shapePatternsRaw.split(',').map(function(x){ return x.trim(); }).filter(Boolean) : [],
      constraints: shapeConstraintsRaw ? shapeConstraintsRaw.split(/\\r?\\n/).map(function(x){ return x.trim(); }).filter(Boolean) : [],
    };
    const body = {
      notes: document.getElementById('edit-notes').value,
      forcing: document.getElementById('edit-forcing').value || null,
      seq_type: document.getElementById('edit-type').value || null,
      hcp_min: hcpMinVal,
      hcp_max: hcpMaxVal,
      alert: document.getElementById('edit-alert').checked,
      shows: showsRaw ? showsRaw.split(/\\r?\\n/).map(function(x){ return x.trim(); }).filter(Boolean) : [],
      shape: shapeObj,
    };
    await fetch('/api/sequences/' + encodeURIComponent(key), {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    btn.textContent = '✅ Сохранено';
    setTimeout(function(){btn.textContent='💾 Сохранить';}, 2000);
    const row = allRows.find(function(r){return r.seq_key===key;});
    if (row) {
      row.notes = body.notes;
      row.forcing = body.forcing || '';
      row.seq_type = body.seq_type || '';
      row.hcp_min = body.hcp_min;
      row.hcp_max = body.hcp_max;
      row.alert = body.alert ? 1 : 0;
    }
    renderTable();
  } catch(e) { showError('Ошибка сохранения: ' + e.message); }
}

async function addComment(key, btn) {
  const inp = document.getElementById('new-comment');
  if (!inp || !inp.value.trim()) return;
  try {
    await fetch('/api/sequences/' + encodeURIComponent(key) + '/comment', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:inp.value, author:'Алексей'})});
    inp.value = '';
    const row = allRows.find(function(r){return r.seq_key===key;});
    if (row) {
      row.comments_count = Number(row.comments_count || 0) + 1;
      row.is_accepted = 0;
    }
    if (curFilter === '1') {
      closeDetail();
      await loadRows();
      await loadStats();
      return;
    }
    renderTable();
    loadStats();
    selectRow(key);
  } catch(e) { showError('Ошибка добавления комментария: ' + e.message); }
}

function openCreateModal(parentKey) {
  createParentKey = parentKey || '';
  document.getElementById('create-parent').value = createParentKey || '(корневая заявка)';
  document.getElementById('create-call').value = '';
  document.getElementById('create-hcp-min').value = '';
  document.getElementById('create-hcp-max').value = '';
  document.getElementById('create-forcing').value = '';
  document.getElementById('create-type').value = '';
  document.getElementById('create-natural').value = '';
  document.getElementById('create-notes').value = '';
  document.getElementById('create-alert').checked = false;
  document.getElementById('create-modal').classList.add('show');
  syncTypeForcing('create', 'init');
  setTimeout(function(){ document.getElementById('create-call').focus(); }, 0);
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('show');
}

async function submitCreate(btn) {
  const call = document.getElementById('create-call').value.trim();
  if (!call) {
    showError('Укажите call для новой секвенции');
    return;
  }
  const hcpMinRaw = document.getElementById('create-hcp-min').value.trim();
  const hcpMaxRaw = document.getElementById('create-hcp-max').value.trim();
  let hcpMinVal = null;
  let hcpMaxVal = null;
  try {
    hcpMinVal = parseHcpInput(hcpMinRaw, 'HCP min');
    hcpMaxVal = parseHcpInput(hcpMaxRaw, 'HCP max');
  } catch (e) {
    showError(e.message);
    return;
  }
  const naturalRaw = document.getElementById('create-natural').value;
  const payload = {
    parent_key: createParentKey || null,
    call: call,
    notes: document.getElementById('create-notes').value.trim(),
    forcing: document.getElementById('create-forcing').value || '',
    seq_type: document.getElementById('create-type').value || '',
    hcp_min: hcpMinVal,
    hcp_max: hcpMaxVal,
    alert: document.getElementById('create-alert').checked,
    natural: naturalRaw === '' ? null : (naturalRaw === 'true')
  };
  try {
    btn.disabled = true;
    btn.textContent = 'Создаю...';
    const r = await fetch('/api/sequences', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error('HTTP ' + r.status + ' ' + txt);
    }
    const d = await r.json();
    closeCreateModal();
    resetViewForCreatedSequence();
    await loadRows();
    await loadStats();
    if (d.seq_key) {
      moveToSequencePage(d.seq_key);
      await selectRow(d.seq_key);
    }
  } catch(e) {
    showError('Ошибка создания секвенции: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Создать';
  }
}

async function toggleAccepted(ev, key, cb) {
  ev.stopPropagation();
  const nextAccepted = !!cb.checked;
  if (nextAccepted) {
    const ok = await askAcceptConfirm();
    if (!ok) { cb.checked = false; return; }
  }
  try {
    const r = await fetch('/api/seq-status/' + encodeURIComponent(key), {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({accepted:nextAccepted})
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const row = allRows.find(function(r){return r.seq_key===key;});
    if (row) {
      row.is_accepted = nextAccepted ? 1 : 0;
      if (nextAccepted) row.comments_count = 0;
    }
    if (curFilter === 'c' && nextAccepted) {
      closeDetail();
    }
    await loadRows();
    await loadStats();
    if (!(curFilter === 'c' && nextAccepted) && selKey === key) await selectRow(key);
  } catch(e) {
    cb.checked = !nextAccepted;
    console.error(e);
  }
}

async function toggleAcceptedDetail(key, cb) {
  const nextAccepted = !!cb.checked;
  if (nextAccepted) {
    const ok = await askAcceptConfirm();
    if (!ok) { cb.checked = false; return; }
  }
  try {
    const r = await fetch('/api/seq-status/' + encodeURIComponent(key), {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({accepted:nextAccepted})
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const row = allRows.find(function(r){return r.seq_key===key;});
    if (row) {
      row.is_accepted = nextAccepted ? 1 : 0;
      if (nextAccepted) row.comments_count = 0;
    }
    if (curFilter === 'c' && nextAccepted) {
      closeDetail();
      await loadRows();
      await loadStats();
      return;
    }
    await loadRows();
    await loadStats();
    await selectRow(key);
  } catch(e) {
    cb.checked = !nextAccepted;
    console.error(e);
  }
}

function setFilter(v) {
  curFilter = v;
  updateFilterButtons();
  loadRows();
}

function setSection(ev, v) {
  curSection = v;
  document.querySelectorAll('.tab').forEach(function(b){b.classList.remove('active');});
  if (ev && ev.target) ev.target.classList.add('active');
  loadRows();
}

let searchTimer;
function doSearch(v) { clearTimeout(searchTimer); searchTimer = setTimeout(function(){curSearch=v; loadRows();}, 350); }

async function doImport() {
  if (!confirm('Переимпортировать данные из YAML?\\nСтатус и комментарии сохранятся.')) return;
  try {
    const r = await fetch('/api/import', {method:'POST'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const src = d.source ? ('\\nИсточник: ' + d.source) : '';
    alert('Импортировано: ' + d.imported + ' записей' + src);
    loadRows(); loadStats();
  } catch(e) { showError('Ошибка импорта: ' + e.message); }
}

function doExport() {
  window.location.href = '/api/export';
}

loadStats();
loadRows();
</script>
</body>
</html>'''

@app.get('/', response_class=HTMLResponse)
def index():
    return HTMLResponse(HTML)

@app.get('/test', response_class=HTMLResponse)
def test_page():
    return """<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>K7 Test</title></head>
<body>
<h2 id="status">Testing...</h2>
<div id="result"></div>
<script>
fetch('/api/stats')
  .then(r => r.json())
  .then(d => {
    document.getElementById('status').textContent = 'OK! Total: ' + d.total;
    document.getElementById('result').textContent = JSON.stringify(d).slice(0, 200);
  })
  .catch(e => { document.getElementById('status').textContent = 'ERROR: ' + e.message; });
</script>
</body></html>"""

if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8001, reload=False)
