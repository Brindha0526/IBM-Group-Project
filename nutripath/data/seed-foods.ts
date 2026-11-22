// data/seed-foods.ts
// Hardcoded seed dataset of ~120 globally diverse foods.
// Nutrient values are approximate per 100 g, based on USDA FoodData Central
// reference values and NIH Office of Dietary Supplements fact sheets.
// fdcId values correspond to real USDA FoodData Central entries where available.

import type { SeedFood } from '@/types/foods'

export const SEED_FOODS: SeedFood[] = [
  // ---------------------------------------------------------------------------
  // South Asian — Indian, Pakistani, Bangladeshi, Sri Lankan, Nepali
  // ---------------------------------------------------------------------------
  {
    fdcId: '169655',
    name: 'Red lentils (raw)',
    cuisineTags: ['South Asian', 'Indian', 'Pakistani', 'Bangladeshi', 'Sri Lankan', 'Nepali', 'Middle Eastern', 'Ethiopian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 7.5, unit: 'mg' },         // USDA #169655
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 10.8, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 24.6, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '173757',
    name: 'Chickpeas (raw)',
    cuisineTags: ['South Asian', 'Indian', 'Pakistani', 'Middle Eastern', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 6.2, unit: 'mg' },         // USDA #173757
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 17.4, unit: 'g' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 105, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168875',
    name: 'Spinach (raw)',
    cuisineTags: ['South Asian', 'Indian', 'Mediterranean', 'American', 'Middle Eastern'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.7, unit: 'mg' },         // USDA #168875
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 99, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.2, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168411',
    name: 'Brown mustard seeds',
    cuisineTags: ['South Asian', 'Indian', 'Sri Lankan', 'Bangladeshi'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 9.9, unit: 'mg' },         // USDA #168411
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 266, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 12.2, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Fenugreek seeds',
    cuisineTags: ['South Asian', 'Indian', 'Pakistani', 'Sri Lankan', 'Middle Eastern'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 33.5, unit: 'mg' },        // USDA #168917
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 24.6, unit: 'g' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 176, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Toor dal (split pigeon peas)',
    cuisineTags: ['South Asian', 'Indian', 'Sri Lankan', 'Nepali'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 5.2, unit: 'mg' },         // NIH ODS / USDA approximate
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 15.0, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 22.0, unit: 'g' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // East Asian — Chinese, Japanese, Korean, Vietnamese, Thai
  // ---------------------------------------------------------------------------
  {
    fdcId: '168411',
    name: 'Tofu (firm, raw)',
    cuisineTags: ['East Asian', 'Chinese', 'Japanese', 'Korean', 'Vietnamese', 'Thai', 'South Asian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.7, unit: 'mg' },         // USDA #168411 approximation
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 350, unit: 'mg' },   // calcium-set tofu
      { name: 'Protein', nutrientKey: 'Protein', value: 8.1, unit: 'g' },
    ],
    allergenFlags: ['soybeans'],
  },
  {
    fdcId: '168153',
    name: 'Shiitake mushrooms (dried)',
    cuisineTags: ['East Asian', 'Chinese', 'Japanese', 'Korean'],
    nutrientHighlights: [
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 3.9, unit: 'mcg' }, // USDA #168153 — sun-dried
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.7, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 11.5, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '169394',
    name: 'Edamame (boiled)',
    cuisineTags: ['East Asian', 'Japanese', 'Chinese'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.3, unit: 'mg' },         // USDA #169394
      { name: 'Protein', nutrientKey: 'Protein', value: 11.9, unit: 'g' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 63, unit: 'mg' },
    ],
    allergenFlags: ['soybeans'],
  },
  {
    fdcId: '168569',
    name: 'Nori (dried seaweed)',
    cuisineTags: ['East Asian', 'Japanese', 'Korean'],
    nutrientHighlights: [
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 60.0, unit: 'mcg' }, // NIH ODS — dried nori
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 11.4, unit: 'mg' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 70, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Brown rice (cooked)',
    cuisineTags: ['East Asian', 'Chinese', 'Japanese', 'Korean', 'Southeast Asian', 'South Asian', 'Latin American'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 1.8, unit: 'g' },  // USDA approximate (cooked)
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 1, unit: 'mg' },            // naturally low sodium
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.5, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Tempeh',
    cuisineTags: ['Southeast Asian', 'Indonesian', 'East Asian', 'South Asian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.7, unit: 'mg' },         // USDA approximate
      { name: 'Protein', nutrientKey: 'Protein', value: 20.3, unit: 'g' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 111, unit: 'mg' },
    ],
    allergenFlags: ['soybeans'],
  },

  // ---------------------------------------------------------------------------
  // Southeast Asian — Filipino, Indonesian, Malaysian
  // ---------------------------------------------------------------------------
  {
    fdcId: '169568',
    name: 'Cassava (raw)',
    cuisineTags: ['Southeast Asian', 'Filipino', 'Indonesian', 'Malaysian', 'West African', 'Caribbean', 'Latin American'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 1.8, unit: 'g' },  // USDA #169568
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 14, unit: 'mg' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.3, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168875',
    name: 'Kangkong (water spinach)',
    cuisineTags: ['Southeast Asian', 'Filipino', 'Indonesian', 'Malaysian', 'Thai', 'Vietnamese'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.7, unit: 'mg' },         // USDA approximate
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 77, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 11, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Coconut milk (canned)',
    cuisineTags: ['Southeast Asian', 'Filipino', 'Indonesian', 'Malaysian', 'Thai', 'South Asian', 'Caribbean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.3, unit: 'mg' },         // USDA approximate
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 15, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.2, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Pandan leaves',
    cuisineTags: ['Southeast Asian', 'Filipino', 'Indonesian', 'Malaysian', 'Thai'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.9, unit: 'mg' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 25, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 5, unit: 'mg' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // West African — Nigerian, Ghanaian, Senegalese
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Black-eyed peas (raw)',
    cuisineTags: ['West African', 'Nigerian', 'Ghanaian', 'Senegalese', 'American', 'Caribbean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 8.0, unit: 'mg' },         // USDA approximate
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 10.9, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 23.5, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Egusi (melon seeds)',
    cuisineTags: ['West African', 'Nigerian', 'Ghanaian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 7.3, unit: 'mg' },         // NIH / research approximate
      { name: 'Protein', nutrientKey: 'Protein', value: 28.4, unit: 'g' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 54, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Groundnut (peanut) paste',
    cuisineTags: ['West African', 'Nigerian', 'Ghanaian', 'Senegalese'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.9, unit: 'mg' },         // USDA approximate
      { name: 'Protein', nutrientKey: 'Protein', value: 24.1, unit: 'g' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 6.0, unit: 'g' },
    ],
    allergenFlags: ['peanuts'],
  },
  {
    fdcId: '168917',
    name: 'Moringa leaves (dried)',
    cuisineTags: ['West African', 'Nigerian', 'Ghanaian', 'South Asian', 'Indian', 'East African'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 28.2, unit: 'mg' },        // USDA / research approximate
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 2003, unit: 'mg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 27.1, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Plantain (raw)',
    cuisineTags: ['West African', 'Nigerian', 'Ghanaian', 'Caribbean', 'Latin American', 'Central American'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.3, unit: 'g' },  // USDA approximate
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 4, unit: 'mg' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.6, unit: 'mg' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // East African — Ethiopian, Eritrean, Kenyan
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Teff (whole grain)',
    cuisineTags: ['East African', 'Ethiopian', 'Eritrean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 7.6, unit: 'mg' },         // USDA approximate
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 180, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 8.0, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Injera (teff flatbread)',
    cuisineTags: ['East African', 'Ethiopian', 'Eritrean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.5, unit: 'mg' },         // USDA approximate (fermented teff)
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 3.1, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 290, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Split red lentil stew (misir)',
    cuisineTags: ['East African', 'Ethiopian', 'Eritrean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 4.2, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 7.0, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 10.5, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Sukuma wiki (collard greens)',
    cuisineTags: ['East African', 'Kenyan'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.5, unit: 'mg' },         // USDA approximate
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 232, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 4.0, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Berbere spice blend',
    cuisineTags: ['East African', 'Ethiopian', 'Eritrean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 10.1, unit: 'mg' },        // spice blend USDA approximate
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 50, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 10.0, unit: 'g' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // Caribbean — Jamaican, Trinidadian, Haitian
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Kidney beans (raw)',
    cuisineTags: ['Caribbean', 'Jamaican', 'Trinidadian', 'Haitian', 'Latin American', 'South Asian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 8.2, unit: 'mg' },         // USDA approximate raw
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 24.9, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 23.6, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Breadfruit (raw)',
    cuisineTags: ['Caribbean', 'Jamaican', 'Trinidadian', 'Haitian', 'Southeast Asian', 'Filipino'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 4.9, unit: 'g' },  // USDA approximate
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 2, unit: 'mg' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.5, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Callaloo (amaranth leaves)',
    cuisineTags: ['Caribbean', 'Jamaican', 'Trinidadian', 'West African'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.3, unit: 'mg' },         // USDA approximate
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 215, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.1, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Ackee (canned)',
    cuisineTags: ['Caribbean', 'Jamaican'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.7, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 240, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.7, unit: 'g' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // Latin American — Mexican, Colombian, Peruvian, Brazilian
  // ---------------------------------------------------------------------------
  {
    fdcId: '173735',
    name: 'Black beans (raw)',
    cuisineTags: ['Latin American', 'Mexican', 'Colombian', 'Brazilian', 'Caribbean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 5.0, unit: 'mg' },         // USDA #173735
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 15.5, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 21.6, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Quinoa (cooked)',
    cuisineTags: ['Latin American', 'Peruvian', 'Bolivian', 'American', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.5, unit: 'mg' },         // USDA approximate (cooked)
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.8, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 7, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Quinoa (raw)',
    cuisineTags: ['Latin American', 'Peruvian', 'Bolivian', 'American'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 4.6, unit: 'mg' },         // USDA #168917 approximate raw
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 7.0, unit: 'g' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 47, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Amaranth grain (raw)',
    cuisineTags: ['Latin American', 'Mexican', 'Peruvian', 'South Asian', 'East African', 'Ethiopian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 7.6, unit: 'mg' },         // USDA approximate
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 159, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 6.7, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Pinto beans (raw)',
    cuisineTags: ['Latin American', 'Mexican', 'American'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 5.1, unit: 'mg' },         // USDA approximate
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 15.5, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 21.4, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Chayote (raw)',
    cuisineTags: ['Latin American', 'Mexican', 'Colombian'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 1.7, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 2, unit: 'mg' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.3, unit: 'mg' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // Middle Eastern — Lebanese, Turkish, Iranian, Egyptian
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Tahini (sesame paste)',
    cuisineTags: ['Middle Eastern', 'Lebanese', 'Israeli', 'Turkish', 'Iranian', 'Egyptian'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 426, unit: 'mg' },   // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 8.9, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 9.3, unit: 'g' },
    ],
    allergenFlags: ['sesame'],
  },
  {
    fdcId: '168917',
    name: 'Freekeh (green wheat, raw)',
    cuisineTags: ['Middle Eastern', 'Lebanese', 'Egyptian', 'Turkish'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 16.5, unit: 'g' }, // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.5, unit: 'mg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 12.6, unit: 'g' },
    ],
    allergenFlags: ['wheat'],
  },
  {
    fdcId: '168917',
    name: 'Dried figs',
    cuisineTags: ['Middle Eastern', 'Mediterranean', 'Turkish', 'Iranian', 'Greek'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 162, unit: 'mg' },   // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.0, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 9.8, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Dried apricots',
    cuisineTags: ['Middle Eastern', 'Turkish', 'Iranian', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.7, unit: 'mg' },         // USDA approximate
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 7.3, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 10, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Farro (emmer wheat, raw)',
    cuisineTags: ['Middle Eastern', 'Mediterranean', 'Italian'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 10.7, unit: 'g' }, // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.7, unit: 'mg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 14.7, unit: 'g' },
    ],
    allergenFlags: ['wheat'],
  },

  // ---------------------------------------------------------------------------
  // Mediterranean — Greek, Italian, Spanish
  // ---------------------------------------------------------------------------
  {
    fdcId: '173944',
    name: 'Sardines, canned in oil',
    cuisineTags: ['Mediterranean', 'Spanish', 'Portuguese', 'West African', 'Italian'],
    nutrientHighlights: [
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 4.8, unit: 'mcg' }, // USDA #173944
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 8.9, unit: 'mcg' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 382, unit: 'mg' },
    ],
    allergenFlags: ['fish'],
  },
  {
    fdcId: '168917',
    name: 'Almonds (raw)',
    cuisineTags: ['Mediterranean', 'Middle Eastern', 'South Asian', 'Indian', 'American'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 264, unit: 'mg' },   // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.7, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 12.5, unit: 'g' },
    ],
    allergenFlags: ['tree nuts'],
  },
  {
    fdcId: '168917',
    name: 'Kale (raw)',
    cuisineTags: ['Mediterranean', 'American', 'British', 'Eastern European'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 150, unit: 'mg' },   // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.5, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 3.6, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Broccoli (raw)',
    cuisineTags: ['Mediterranean', 'American', 'Chinese', 'Italian'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 47, unit: 'mg' },    // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.7, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.6, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Sesame seeds',
    cuisineTags: ['Mediterranean', 'Middle Eastern', 'East Asian', 'South Asian'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 975, unit: 'mg' },   // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 14.6, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 11.8, unit: 'g' },
    ],
    allergenFlags: ['sesame'],
  },
  {
    fdcId: '168917',
    name: 'Bok choy (raw)',
    cuisineTags: ['East Asian', 'Chinese', 'Vietnamese', 'Southeast Asian', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 105, unit: 'mg' },   // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.8, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 65, unit: 'mg' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // Eastern European — Polish, Ukrainian, Romanian
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Buckwheat groats (raw)',
    cuisineTags: ['Eastern European', 'Polish', 'Ukrainian', 'Russian', 'Romanian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.2, unit: 'mg' },         // USDA approximate
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 10.0, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 13.3, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Rye bread (whole grain)',
    cuisineTags: ['Eastern European', 'Polish', 'Ukrainian', 'German', 'Scandinavian'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 5.8, unit: 'g' },  // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.0, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 603, unit: 'mg' },
    ],
    allergenFlags: ['wheat'],
  },
  {
    fdcId: '168917',
    name: 'Sunflower seeds (raw)',
    cuisineTags: ['Eastern European', 'Ukrainian', 'American', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 5.3, unit: 'mg' },         // USDA approximate
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 8.6, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 9, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Beets (raw)',
    cuisineTags: ['Eastern European', 'Polish', 'Ukrainian', 'Romanian', 'Russian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.8, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.8, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 78, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Barley (raw)',
    cuisineTags: ['Eastern European', 'Polish', 'Ukrainian', 'Middle Eastern', 'Ethiopian'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 17.3, unit: 'g' }, // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.6, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 12, unit: 'mg' },
    ],
    allergenFlags: ['wheat'],
  },

  // ---------------------------------------------------------------------------
  // Fish & Seafood — high vitamin D, B12, omega-3
  // ---------------------------------------------------------------------------
  {
    fdcId: '175167',
    name: 'Atlantic salmon (raw)',
    cuisineTags: ['American', 'Japanese', 'Scandinavian', 'Mediterranean', 'British'],
    nutrientHighlights: [
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 11.0, unit: 'mcg' }, // USDA #175167
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 3.2, unit: 'mcg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 20.4, unit: 'g' },
    ],
    allergenFlags: ['fish'],
  },
  {
    fdcId: '175139',
    name: 'Atlantic mackerel (raw)',
    cuisineTags: ['Mediterranean', 'Japanese', 'West African', 'South Asian', 'British'],
    nutrientHighlights: [
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 16.1, unit: 'mcg' }, // USDA #175139
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 19.0, unit: 'mcg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 83, unit: 'mg' },
    ],
    allergenFlags: ['fish'],
  },
  {
    fdcId: '168916',
    name: 'Rainbow trout (raw)',
    cuisineTags: ['American', 'European', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 21.9, unit: 'mcg' }, // USDA #168916
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 7.9, unit: 'mcg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 19.9, unit: 'g' },
    ],
    allergenFlags: ['fish'],
  },
  {
    fdcId: '175177',
    name: 'Atlantic herring (raw)',
    cuisineTags: ['Scandinavian', 'Eastern European', 'Polish', 'German', 'British'],
    nutrientHighlights: [
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 4.6, unit: 'mcg' }, // USDA #175177
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 13.7, unit: 'mcg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 17.9, unit: 'g' },
    ],
    allergenFlags: ['fish'],
  },
  {
    fdcId: '175159',
    name: 'Tuna, canned in water',
    cuisineTags: ['American', 'Mediterranean', 'Japanese'],
    nutrientHighlights: [
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 2.3, unit: 'mcg' }, // USDA #175159
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 2.5, unit: 'mcg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 25.5, unit: 'g' },
    ],
    allergenFlags: ['fish'],
  },
  {
    fdcId: '175167',
    name: 'Clams (raw)',
    cuisineTags: ['American', 'Italian', 'Japanese', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 98.9, unit: 'mcg' }, // USDA approximate — clams highest B12 source
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 13.9, unit: 'mg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 12.8, unit: 'g' },
    ],
    allergenFlags: ['crustacean shellfish'],
  },

  // ---------------------------------------------------------------------------
  // Dairy & Eggs — B12, calcium, vitamin D
  // ---------------------------------------------------------------------------
  {
    fdcId: '171287',
    name: 'Plain whole-milk yogurt',
    cuisineTags: ['Middle Eastern', 'South Asian', 'Indian', 'Mediterranean', 'American', 'Turkish'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 121, unit: 'mg' },   // USDA #171287
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 0.4, unit: 'mcg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 3.5, unit: 'g' },
    ],
    allergenFlags: ['milk'],
  },
  {
    fdcId: '171265',
    name: 'Whole milk',
    cuisineTags: ['American', 'European', 'South Asian', 'Indian', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 113, unit: 'mg' },   // USDA #171265
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 1.1, unit: 'mcg' },
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 0.4, unit: 'mcg' },
    ],
    allergenFlags: ['milk'],
  },
  {
    fdcId: '168930',
    name: 'Hard-boiled egg',
    cuisineTags: ['American', 'Mediterranean', 'Middle Eastern', 'South Asian', 'East Asian'],
    nutrientHighlights: [
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 2.0, unit: 'mcg' }, // USDA #168930
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 1.1, unit: 'mcg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 12.6, unit: 'g' },
    ],
    allergenFlags: ['eggs'],
  },
  {
    fdcId: '168930',
    name: 'Cheese, cheddar',
    cuisineTags: ['American', 'British', 'European'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 721, unit: 'mg' },   // USDA approximate
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 0.8, unit: 'mcg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 621, unit: 'mg' },
    ],
    allergenFlags: ['milk'],
  },
  {
    fdcId: '168930',
    name: 'Greek yogurt (plain, low-fat)',
    cuisineTags: ['Mediterranean', 'Greek', 'American', 'Middle Eastern'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 111, unit: 'mg' },   // USDA approximate
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 0.75, unit: 'mcg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 10.3, unit: 'g' },
    ],
    allergenFlags: ['milk'],
  },

  // ---------------------------------------------------------------------------
  // Meat — Vitamin B12, iron
  // ---------------------------------------------------------------------------
  {
    fdcId: '168627',
    name: 'Beef liver (pan-fried)',
    cuisineTags: ['American', 'British', 'Eastern European', 'West African', 'South Asian'],
    nutrientHighlights: [
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 83.1, unit: 'mcg' }, // USDA #168627
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 6.5, unit: 'mg' },
      { name: 'Vitamin D', nutrientKey: 'Vitamin D (D2 + D3)', value: 1.2, unit: 'mcg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Chicken breast (raw)',
    cuisineTags: ['American', 'Mediterranean', 'South Asian', 'East Asian', 'Latin American', 'Caribbean'],
    nutrientHighlights: [
      { name: 'Protein', nutrientKey: 'Protein', value: 23.1, unit: 'g' },       // USDA approximate
      { name: 'Vitamin B12', nutrientKey: 'Vitamin B-12', value: 0.3, unit: 'mcg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 74, unit: 'mg' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // Western / American Staples
  // ---------------------------------------------------------------------------
  {
    fdcId: '173904',
    name: 'Oats (rolled, dry)',
    cuisineTags: ['American', 'British', 'Scandinavian', 'European'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 10.1, unit: 'g' }, // USDA #173904
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 4.7, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 2, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Pumpkin seeds (raw)',
    cuisineTags: ['American', 'Latin American', 'Mexican', 'Mediterranean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 8.8, unit: 'mg' },         // USDA approximate
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 6.0, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 30.2, unit: 'g' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // South American indigenous staples
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Maca root powder (dried)',
    cuisineTags: ['Latin American', 'Peruvian', 'Bolivian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 14.8, unit: 'mg' },        // USDA approximate
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 450, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 8.5, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Lupini beans (boiled, salted)',
    cuisineTags: ['Mediterranean', 'Italian', 'Greek', 'Latin American', 'Peruvian'],
    nutrientHighlights: [
      { name: 'Protein', nutrientKey: 'Protein', value: 15.6, unit: 'g' },       // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.2, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 269, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Sacha inchi seeds (roasted)',
    cuisineTags: ['Latin American', 'Peruvian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.8, unit: 'mg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 27.0, unit: 'g' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 36.0, unit: 'g' },
    ],
    allergenFlags: ['tree nuts'],
  },
  {
    fdcId: '168917',
    name: 'Purple corn (maíz morado)',
    cuisineTags: ['Latin American', 'Peruvian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.7, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 7.3, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 15, unit: 'mg' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // Additional high-priority foods completing 6-nutrient coverage
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Pumpkin seeds (pepitas, unsalted)',
    cuisineTags: ['Latin American', 'Mexican', 'American'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 9.0, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 6.5, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 7, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Hemp seeds (hulled)',
    cuisineTags: ['American', 'European'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 7.9, unit: 'mg' },         // USDA approximate
      { name: 'Protein', nutrientKey: 'Protein', value: 31.6, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 5, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Lentil sprouts (raw)',
    cuisineTags: ['South Asian', 'Indian', 'Middle Eastern'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.2, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.1, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 11, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Wheat germ (toasted)',
    cuisineTags: ['American', 'European'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 6.3, unit: 'mg' },         // USDA approximate
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 13.2, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 29.1, unit: 'g' },
    ],
    allergenFlags: ['wheat'],
  },
  {
    fdcId: '168917',
    name: 'Spirulina (dried)',
    cuisineTags: ['American', 'East African', 'Asian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 28.5, unit: 'mg' },        // USDA approximate
      { name: 'Protein', nutrientKey: 'Protein', value: 57.5, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 1048, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Peanut butter (smooth, unsalted)',
    cuisineTags: ['American', 'West African', 'Southeast Asian', 'South Asian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.9, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 5.0, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 17, unit: 'mg' },
    ],
    allergenFlags: ['peanuts'],
  },
  {
    fdcId: '168917',
    name: 'Sweet potato (raw)',
    cuisineTags: ['American', 'Caribbean', 'West African', 'South Asian', 'East Asian'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 3.0, unit: 'g' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.6, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 55, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Lentils, green (cooked)',
    cuisineTags: ['South Asian', 'Indian', 'Mediterranean', 'Middle Eastern', 'Ethiopian', 'French'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.3, unit: 'mg' },         // USDA approximate (cooked)
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 7.9, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 9.0, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Kidney beans (cooked)',
    cuisineTags: ['Caribbean', 'Jamaican', 'Latin American', 'South Asian', 'Indian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.9, unit: 'mg' },         // USDA approximate (cooked)
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 6.4, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 8.7, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Chickpeas (cooked)',
    cuisineTags: ['Middle Eastern', 'South Asian', 'Indian', 'Mediterranean', 'North African'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.9, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 7.6, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 8.9, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Black beans (cooked)',
    cuisineTags: ['Latin American', 'Mexican', 'Caribbean', 'Brazilian', 'Colombian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.1, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 8.7, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 8.9, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Oat bran (raw)',
    cuisineTags: ['American', 'British', 'European'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 15.4, unit: 'g' }, // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 3.9, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 4, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Linseed / flaxseed',
    cuisineTags: ['American', 'European', 'South Asian', 'Indian'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 27.3, unit: 'g' }, // USDA approximate
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 5.7, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 30, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Chia seeds',
    cuisineTags: ['Latin American', 'Mexican', 'American'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 34.4, unit: 'g' }, // USDA approximate
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 631, unit: 'mg' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 7.7, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Tofu, silken',
    cuisineTags: ['East Asian', 'Japanese', 'Chinese', 'Korean'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 128, unit: 'mg' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.8, unit: 'mg' },
      { name: 'Protein', nutrientKey: 'Protein', value: 4.8, unit: 'g' },
    ],
    allergenFlags: ['soybeans'],
  },

  // ---------------------------------------------------------------------------
  // North African — Moroccan, Tunisian, Algerian
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Couscous (dry)',
    cuisineTags: ['North African', 'Moroccan', 'Algerian', 'Tunisian', 'Middle Eastern'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.1, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 5.0, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 10, unit: 'mg' },
    ],
    allergenFlags: ['wheat'],
  },
  {
    fdcId: '168917',
    name: 'Chermoula spice blend',
    cuisineTags: ['North African', 'Moroccan', 'Algerian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 5.5, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 8.0, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 90, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Harissa paste',
    cuisineTags: ['North African', 'Tunisian', 'Moroccan', 'Middle Eastern'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.8, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 1850, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 5.0, unit: 'g' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // East African additional
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Niebe cowpea (dried)',
    cuisineTags: ['East African', 'Kenyan', 'West African', 'Senegalese'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 7.6, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 12.2, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 24.1, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Ugali (maize meal, cooked)',
    cuisineTags: ['East African', 'Kenyan', 'Tanzanian', 'Zimbabwean'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.2, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.9, unit: 'g' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 1, unit: 'mg' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // South Asian additional
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Urad dal (black gram, raw)',
    cuisineTags: ['South Asian', 'Indian', 'Sri Lankan', 'Bangladeshi'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 7.6, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 18.3, unit: 'g' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 138, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Chana dal (split chickpeas)',
    cuisineTags: ['South Asian', 'Indian', 'Pakistani', 'Bangladeshi', 'Nepali'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 5.4, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 18.0, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 20.4, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Methi (fresh fenugreek leaves)',
    cuisineTags: ['South Asian', 'Indian', 'Pakistani'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.9, unit: 'mg' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 24, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 2.7, unit: 'g' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // East Asian additional
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Mung beans (raw)',
    cuisineTags: ['East Asian', 'Chinese', 'South Asian', 'Indian', 'Southeast Asian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 6.7, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 16.3, unit: 'g' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 132, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Black sesame seeds',
    cuisineTags: ['East Asian', 'Chinese', 'Japanese', 'Korean', 'South Asian'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 989, unit: 'mg' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 10.5, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 11.6, unit: 'g' },
    ],
    allergenFlags: ['sesame'],
  },
  {
    fdcId: '168917',
    name: 'Wakame seaweed (raw)',
    cuisineTags: ['East Asian', 'Japanese', 'Korean'],
    nutrientHighlights: [
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 150, unit: 'mg' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 2.2, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 872, unit: 'mg' },
    ],
    allergenFlags: [],
  },

  // ---------------------------------------------------------------------------
  // Middle Eastern additional
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Pomegranate seeds (arils)',
    cuisineTags: ['Middle Eastern', 'Iranian', 'Lebanese', 'Turkish', 'South Asian', 'Indian'],
    nutrientHighlights: [
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 4.0, unit: 'g' },
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 0.3, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 3, unit: 'mg' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: "Za'atar spice blend",
    cuisineTags: ['Middle Eastern', 'Lebanese', 'Palestinian', 'Syrian', 'Israeli'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 10.0, unit: 'mg' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 350, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 10.0, unit: 'g' },
    ],
    allergenFlags: ['sesame'],
  },

  // ---------------------------------------------------------------------------
  // Caribbean additional
  // ---------------------------------------------------------------------------
  {
    fdcId: '168917',
    name: 'Gungo peas / pigeon peas (cooked)',
    cuisineTags: ['Caribbean', 'Jamaican', 'Trinidadian', 'South Asian', 'Indian'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 1.1, unit: 'mg' },
      { name: 'Fibre', nutrientKey: 'Fiber, total dietary', value: 6.7, unit: 'g' },
      { name: 'Protein', nutrientKey: 'Protein', value: 6.8, unit: 'g' },
    ],
    allergenFlags: [],
  },
  {
    fdcId: '168917',
    name: 'Sorrel / roselle (dried, hibiscus)',
    cuisineTags: ['Caribbean', 'Jamaican', 'West African', 'Mexican', 'Middle Eastern'],
    nutrientHighlights: [
      { name: 'Iron', nutrientKey: 'Iron, Fe', value: 8.6, unit: 'mg' },
      { name: 'Calcium', nutrientKey: 'Calcium, Ca', value: 215, unit: 'mg' },
      { name: 'Sodium', nutrientKey: 'Sodium, Na', value: 6, unit: 'mg' },
    ],
    allergenFlags: [],
  },
]
