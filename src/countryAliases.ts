/**
 * Common names, abbreviations and former names mapped onto the labels the API
 * actually uses. Search only - a guess is still submitted under the official
 * name, so this changes what you can find, never what counts as correct.
 */
export const COUNTRY_ALIASES: Record<string, string[]> = {
  'United States': ['usa', 'us', 'united states of america', 'america'],
  'United Kingdom': ['uk', 'great britain', 'britain', 'england', 'scotland', 'wales'],
  Netherlands: ['holland', 'the netherlands'],
  'Czech Republic': ['czechia'],
  'United Arab Emirates': ['uae', 'emirates', 'dubai', 'abu dhabi'],
  Myanmar: ['burma'],
  Eswatini: ['swaziland'],
  'Ivory Coast': ["cote d'ivoire", 'cote divoire'],
  'Cape Verde': ['cabo verde'],
  Turkey: ['turkiye'],
  'South Korea': ['korea', 'republic of korea', 'rok'],
  'North Korea': ['dprk', 'democratic republic of korea'],
  Russia: ['russian federation'],
  'The Bahamas': ['bahamas'],
  'Democratic Republic of the Congo': ['drc', 'dr congo', 'zaire', 'congo kinshasa'],
  Congo: ['congo brazzaville', 'republic of the congo'],
  'Timor-Leste': ['east timor', 'timor'],
  'Vatican City State (Holy See)': ['vatican', 'holy see', 'vatican city'],
  'Man (Isle of)': ['isle of man'],
  'Fiji Islands': ['fiji'],
  'Macau S.A.R.': ['macau', 'macao'],
  'Hong Kong S.A.R.': ['hong kong'],
  Laos: ['lao', "lao people's democratic republic"],
  Syria: ['syrian arab republic'],
  Vietnam: ['viet nam'],
  Taiwan: ['chinese taipei', 'republic of china'],
  Moldova: ['republic of moldova'],
  Tanzania: ['united republic of tanzania'],
  Bolivia: ['plurinational state of bolivia'],
  Venezuela: ['bolivarian republic of venezuela'],
  Iran: ['persia', 'islamic republic of iran'],
  'Palestinian Territory Occupied': ['palestine', 'west bank', 'gaza'],
  'Saint Helena': ['st helena'],
  'Saint Kitts and Nevis': ['st kitts', 'st kitts and nevis'],
  'Saint Lucia': ['st lucia'],
  'Saint Vincent and the Grenadines': ['st vincent', 'st vincent and the grenadines'],
  'Virgin Islands (British)': ['british virgin islands', 'bvi'],
  'Virgin Islands (US)': ['us virgin islands', 'usvi'],
}

/** alias -> official label, flattened once for lookup. */
export const ALIAS_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_ALIASES).flatMap(([label, aliases]) =>
    aliases.map((alias) => [alias, label]),
  ),
)
