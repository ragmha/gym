import type { DefaultTheme } from 'styled-components/native'

import * as z from 'zod'

const colorSchema = z.object({
  primary: z.string(),
  primaryVariant: z.string(),
  secondary: z.string(),
  secondaryVariant: z.string(),
  background: z.string(),
  surface: z.string(),
  error: z.string(),
  onPrimary: z.string(),
  onSecondary: z.string(),
  onBackground: z.string(),
  onSurface: z.string(),
  onError: z.string(),
})

const typographySchema = z.object({
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.string(),
  letterSpacing: z.number(),
  lineHeight: z.number(),
})

const themeSchema = z.object({
  colors: colorSchema,
  typography: z.object({
    h1: typographySchema,
    h2: typographySchema,
    h3: typographySchema,
    h4: typographySchema,
    h5: typographySchema,
    h6: typographySchema,
    subtitle1: typographySchema,
    subtitle2: typographySchema,
    body1: typographySchema,
    body2: typographySchema,
    button: typographySchema,
    caption: typographySchema,
    overline: typographySchema,
  }),
})

type ThemeSchema = z.infer<typeof themeSchema>

export interface Theme extends DefaultTheme, ThemeSchema {}
