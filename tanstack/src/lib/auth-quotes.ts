export type AuthQuote = {
  text: string
  attribution: string
}

export const AUTH_QUOTES: AuthQuote[] = [
  {
    text: 'The best way to predict the future is to invent it.',
    attribution: 'Alan Kay',
  },
  {
    text: 'Software is a great combination between artistry and engineering.',
    attribution: 'Bill Gates',
  },
  {
    text: 'Talk is cheap. Show me the code.',
    attribution: 'Linus Torvalds',
  },
  {
    text: 'The most damaging phrase in the language is “We’ve always done it this way.”',
    attribution: 'Grace Hopper',
  },
  {
    text: 'Simplicity is the ultimate sophistication.',
    attribution: 'Leonardo da Vinci',
  },
  {
    text: 'First, solve the problem. Then, write the code.',
    attribution: 'John Johnson',
  },
  {
    text: 'Programs must be written for people to read, and only incidentally for machines to execute.',
    attribution: 'Harold Abelson',
  },
  {
    text: 'Any sufficiently advanced technology is indistinguishable from magic.',
    attribution: 'Arthur C. Clarke',
  },
  {
    text: 'The only way to do great work is to love what you do.',
    attribution: 'Steve Jobs',
  },
  {
    text: 'In real open source, you have the right to control your own destiny.',
    attribution: 'Linus Torvalds',
  },
  {
    text: 'Knowledge is power. Sharing knowledge is more powerful.',
    attribution: 'Community proverb',
  },
  {
    text: 'Build for the few who care deeply - the rest will follow.',
    attribution: 'Refetch',
  },
]

export function pickAuthQuote(): AuthQuote {
  const index = Math.floor(Math.random() * AUTH_QUOTES.length)
  return AUTH_QUOTES[index] ?? AUTH_QUOTES[0]!
}
