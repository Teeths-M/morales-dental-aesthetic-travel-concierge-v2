import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { randomBytes } from 'node:crypto';

// ======================================
// HELPERS
// ======================================

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const isoDate = (date) =>
  new Date(date).toISOString().slice(0, 10);

const token = () =>
  randomBytes(32).toString('hex');

// ======================================
// SAFE DATE CALCULATOR
// ======================================

const calcDates = (
  procedureDateTime,
  recoveryDays,
  destination
) => {

  if (!destination) {
    throw new Error('Destination not found');
  }

  const flightDays =
    destination.flight_days || [];

  if (!Array.isArray(flightDays)) {
    throw new Error(
      'Flight days must be an array'
    );
  }

  if (flightDays.length === 0) {
    throw new Error(
      'No flight days configured'
    );
  }

  const buffer = Number(
    destination.default_buffer_days || 1
  );

  const proc = new Date(procedureDateTime);

  if (isNaN(proc.getTime())) {
    throw new Error(
      'Invalid procedure date'
    );
  }

  // ARRIVAL DATE
  let arrival = addDays(
    new Date(
      proc.getFullYear(),
      proc.getMonth(),
      proc.getDate()
    ),
    -buffer
  );

  let attempts = 0;

  while (
    !flightDays.includes(arrival.getDay())
  ) {
    arrival = addDays(arrival, -1);

    attempts++;

    if (attempts > 14) {
      throw new Error(
        'No valid arrival flight found'
      );
    }
  }

  // DEPARTURE DATE
  let departure = addDays(
    proc,
    recoveryDays
  );

  attempts = 0;

  while (
    !flightDays.includes(
      departure.getDay()
    )
  ) {
    departure = addDays(
      departure,
      1
    );

    attempts++;

    if (attempts > 14) {
      throw new Error(
        'No valid departure flight found'
      );
    }
  }

  return {
    arrival: isoDate(arrival),
    departure: isoDate(departure),
    explanation: `Arrive on ${isoDate(arrival)} because flights to ${destination.country} operate on days ${flightDays.join(', ')}`
  };
};

// ======================================
// MAIN SERVER
// ======================================

Deno.serve(async (req) => {

  try {

    const base44 =
      createClientFromRequest(req);

    // ======================================
    // AUTH CHECK
    // ======================================

    const user =
      await base44.auth.me();

    const role =
      user?.role ||
      user?.metadata?.role;

    if (
      !user ||
      ![
        'doctor',
        'admin',
        'platform_admin'
      ].includes(role)
    ) {
      return Response.json(
        {
          error: 'Forbidden'
        },
        { status: 403 }
      );
    }

    // ======================================
    // REQUEST BODY
    // ======================================

    const body =
      await req.json();

    if (!body.request_id) {
      return Response.json(
        {
          error:
            'request_id is required'
        },
        { status: 400 }
      );
    }

    // ======================================
    // GET REQUEST
    // ======================================

    const request =
      (
        await base44
          .asServiceRole
          .entities
          .PatientRequest
          .filter({
            id: body.request_id
          })
      )[0];

    if (!request) {
      return Response.json(
        {
          error:
            'Request not found'
        },
        { status: 404 }
      );
    }

    if (
      !request.procedure_datetime
    ) {
      return Response.json(
        {
          error:
            'Procedure date missing'
        },
        { status: 400 }
      );
    }

    // ======================================
    // GET PATIENT
    // ======================================

    const patient =
      (
        await base44
          .asServiceRole
          .entities
          .Patient
          .filter({
            id:
              request.patient_id
          })
      )[0];

    if (!patient) {
      return Response.json(
        {
          error:
            'Patient not found'
        },
        { status: 404 }
      );
    }

    // ======================================
    // GET PROCEDURE
    // ======================================

    const procedure =
      (
        await base44
          .asServiceRole
          .entities
          .ConciergeProcedure
          .filter({
            id:
              request.procedure_id
          })
      )[0];

    if (!procedure) {
      return Response.json(
        {
          error:
            'Procedure not found'
        },
        { status: 404 }
      );
    }

    // ======================================
    // GET DESTINATION
    // ======================================

    const destination =
      (
        await base44
          .asServiceRole
          .entities
          .Destination
          .filter({
            country:
              request.destination_country
          })
      )[0];

    if (!destination) {
      return Response.json(
        {
          error:
            'Destination not found'
        },
        { status: 404 }
      );
    }

    // ======================================
    // CALCULATE DATES
    // ======================================

    const calculated =
      calcDates(
        request.procedure_datetime,
        body.recovery_days ||
          procedure.default_recovery_days,
        destination
      );

    // ======================================
    // UPDATE REQUEST
    // ======================================

    await base44
      .asServiceRole
      .entities
      .PatientRequest
      .update(
        request.id,
        {
          status:
            'procedures_confirmed',

          doctor_price_usd:
            Number(
              body.doctor_price_usd ||
              procedure.default_price_usd
            ),

          recovery_days:
            Number(
              body.recovery_days ||
              procedure.default_recovery_days
            ),

          recommended_arrival_date:
            body.recommended_arrival_date ||
            calculated.arrival,

          recommended_departure_date:
            body.recommended_departure_date ||
            calculated.departure,

          travel_recommendation_explanation:
            body.travel_recommendation_explanation ||
            calculated.explanation
        }
      );

    // ======================================
    // MAGIC LINK SETTINGS
    // ======================================

    const appUrl =
      Deno.env.get(
        'APP_URL'
      ) ||
      'https://yourapp.com';

    const expires =
      new Date(
        Date.now() +
        7 * 24 * 60 * 60 * 1000
      );

    const arrivalDate =
      body.recommended_arrival_date ||
      calculated.arrival;

    const departureDate =
      body.recommended_departure_date ||
      calculated.departure;

    const procedureDate =
      new Date(
        request.procedure_datetime
      ).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );

    // ======================================
    // SEND MAGIC EMAIL
    // ======================================

    const sendMagic =
      async (
        entity,
        record,
        portalType
      ) => {

        if (!record?.email) {
          console.warn(
            `Missing email for ${entity}`
          );
          return;
        }

        const magicToken =
          token();

        await base44
          .asServiceRole
          .entities[
            entity
          ]
          .update(
            record.id,
            {
              token:
                magicToken,

              token_expires_at:
                expires.toISOString()
            }
          );

        const magicLink =
          `${appUrl}/portal/${portalType}?token=${magicToken}`;

        const emailBody =
`A patient has been confirmed for a procedure in ${request.destination_country} on ${procedureDate}.

Patient:
${patient.name}

Procedure:
${procedure.name}

Recommended arrival:
${arrivalDate}

Recommended departure:
${departureDate}

Click below to provide your quote:

${magicLink}

This link expires in 7 days.`;

        await base44
          .asServiceRole
          .registrations
          .Core
          .SendEmail({
            to: record.email,
            subject:
              `New Patient Needs Your Quote – ${patient.name}`,
            body:
              emailBody
          });
      };

    // ======================================
    // SEND TO TRAVEL AGENCIES
    // ======================================

    const agencies =
      await base44
        .asServiceRole
        .entities
        .TravelAgency
        .filter({
          country:
            request.destination_country
        });

    for (
      const agency
      of agencies
    ) {
      await sendMagic(
        'TravelAgency',
        agency,
        'travel'
      );
    }

    // ======================================
    // SEND TO ORIGIN DRIVERS
    // ======================================

    const originDrivers =
      await base44
        .asServiceRole
        .entities
        .OriginDriver
        .filter({
          country:
            patient.home_country
        });

    for (
      const driver
      of originDrivers
    ) {
      await sendMagic(
        'OriginDriver',
        driver,
        'origin'
      );
    }

    // ======================================
    // SEND TO DESTINATION DRIVERS
    // ======================================

    const destinationDrivers =
      await base44
        .asServiceRole
        .entities
        .DestinationDriver
        .filter({
          country:
            request.destination_country
        });

    for (
      const driver
      of destinationDrivers
    ) {
      await sendMagic(
        'DestinationDriver',
        driver,
        'destination'
      );
    }

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return Response.json({
      success: true,
      message:
        'Procedure confirmed and partner quotes requested.'
    });

  } catch (error) {

    console.error(
      'SERVER ERROR:',
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          'Unexpected server error'
      },
      { status: 500 }
    );
  }
});