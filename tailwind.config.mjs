/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-fraunces)', 'serif'],
      },
      typography: () => ({
        DEFAULT: {
          css: [
            {
              '--tw-prose-body': 'var(--foreground)',
              '--tw-prose-headings': 'var(--foreground)',
              h1: {
                fontFamily: 'var(--font-fraunces), serif',
                fontWeight: 600,
                marginBottom: '0.25em',
              },
              h2: {
                fontFamily: 'var(--font-fraunces), serif',
                fontWeight: 600,
              },
              h3: {
                fontFamily: 'var(--font-fraunces), serif',
                fontWeight: 600,
              },
              a: {
                color: '#3A8FE8',
                textDecoration: 'underline',
                '&:hover': {
                  color: '#2D72BA',
                },
              },
            },
          ],
        },
        base: {
          css: [
            {
              h1: {
                fontSize: '2.5rem',
              },
              h2: {
                fontSize: '1.25rem',
              },
            },
          ],
        },
        md: {
          css: [
            {
              h1: {
                fontSize: '3.5rem',
              },
              h2: {
                fontSize: '1.5rem',
              },
            },
          ],
        },
      }),
    },
  },
}

export default config
