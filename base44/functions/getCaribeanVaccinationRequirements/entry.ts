import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination } = await req.json();

    // Comprehensive Caribbean vaccination requirements based on CDC and WHO data
    const caribbeanVaccinations = {
      antigua_and_barbuda: {
        country: 'Antigua and Barbuda',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' },
          { name: 'Yellow Fever', reason: 'Recommended for some areas' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      aruba: {
        country: 'Aruba',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      bahamas: {
        country: 'Bahamas',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      barbados: {
        country: 'Barbados',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      belize: {
        country: 'Belize',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' },
          { name: 'Yellow Fever', reason: 'Jungle travel areas' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      bonaire: {
        country: 'Bonaire',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      cayman_islands: {
        country: 'Cayman Islands',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      curacao: {
        country: 'Curaçao',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      dominica: {
        country: 'Dominica',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      dominican_republic: {
        country: 'Dominican Republic',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      grenada: {
        country: 'Grenada',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      guadeloupe: {
        country: 'Guadeloupe',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' },
          { name: 'Dengue Fever', reason: 'Mosquito-borne illness' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      jamaica: {
        country: 'Jamaica',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      martinique: {
        country: 'Martinique',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' },
          { name: 'Dengue Fever', reason: 'Mosquito-borne illness' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      montserrat: {
        country: 'Montserrat',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      puerto_rico: {
        country: 'Puerto Rico',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Dengue Fever', reason: 'Mosquito-borne illness' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      saint_kitts_nevis: {
        country: 'Saint Kitts and Nevis',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      saint_lucia: {
        country: 'Saint Lucia',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      saint_vincent_grenadines: {
        country: 'Saint Vincent and the Grenadines',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      sint_maarten: {
        country: 'Sint Maarten',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      trinidad_and_tobago: {
        country: 'Trinidad and Tobago',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' },
          { name: 'Typhoid', reason: 'Foodborne illness risk' },
          { name: 'Yellow Fever', reason: 'Jungle and forested areas' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      venezuela: {
        country: 'Venezuela',
        required: [
          { name: 'Yellow Fever', reason: 'HIGH RISK - Get vaccinated at least 10 days before travel' }
        ],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk (especially for younger travelers)' },
          { name: 'Typhoid', reason: 'Foodborne illness risk - especially in rural areas' },
          { name: 'Malaria Prophylaxis', reason: 'Prescription medication for areas below 1,700m elevation' },
          { name: 'Rabies', reason: 'If hiking/outdoor activities with wildlife exposure' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza', 'COVID-19']
      },
      turks_caicos: {
        country: 'Turks and Caicos Islands',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      virgin_islands_us: {
        country: 'Virgin Islands, U.S.',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      },
      virgin_islands_british: {
        country: 'Virgin Islands, British',
        required: [],
        recommended: [
          { name: 'Hepatitis A', reason: 'Food and water safety' },
          { name: 'Hepatitis B', reason: 'Blood exposure risk' }
        ],
        routine: ['MMR', 'Tdap', 'Influenza']
      }
    };

    if (destination && caribbeanVaccinations[destination]) {
      return Response.json(caribbeanVaccinations[destination]);
    }

    return Response.json(caribbeanVaccinations);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});