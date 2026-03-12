export type GlobalSearchUserResult = {
  id: string
  label: string
  subtitle: string
  href: string
}

export type GlobalSearchTournamentResult = {
  id: string
  label: string
  subtitle: string
  href: string
}

export type GlobalSearchPostResult = {
  id: string
  label: string
  subtitle: string
  href: string
}

export type GlobalSearchResponse = {
  query: string
  users: GlobalSearchUserResult[]
  tournaments: GlobalSearchTournamentResult[]
  posts: GlobalSearchPostResult[]
}
