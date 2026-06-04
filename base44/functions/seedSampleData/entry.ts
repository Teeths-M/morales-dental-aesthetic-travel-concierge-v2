import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const mockData = {
            consultations: [
                {
                    patient_name: "Sarah Johnson",
                    email: "sarah.johnson@example.com",
                    phone: "+1-555-0101",
                    procedure_interest: "dental_implants",
                    preferred_date: "2026-07-15",
                    client_country: "United States",
                    destination_country: "Costa Rica",
                    age: "45",
                    gender: "Female",
                    medical_conditions: ["Hypertension"],
                    takes_medications: true,
                    medication_types: ["Lisinopril"],
                    allergies: ["Penicillin"],
                    smoking_status: false,
                    has_companion: true,
                    companion_relationship: "Spouse",
                    duration_of_stay: "10 days",
                    passport_number: "US123456789",
                    passport_expiry_date: "2028-05-20"
                },
                {
                    patient_name: "Michael Chen",
                    email: "m.chen@example.com",
                    phone: "+1-555-0102",
                    procedure_interest: "rhinoplasty",
                    preferred_date: "2026-08-01",
                    client_country: "Canada",
                    destination_country: "Mexico",
                    age: "32",
                    gender: "Male",
                    medical_conditions: [],
                    takes_medications: false,
                    medication_types: [],
                    allergies: [],
                    smoking_status: false,
                    has_companion: false,
                    companion_relationship: "",
                    duration_of_stay: "7 days",
                    passport_number: "CA987654321",
                    passport_expiry_date: "2027-11-10"
                },
                {
                    patient_name: "Emma Williams",
                    email: "emma.w@example.com",
                    phone: "+44-20-7946-0958",
                    procedure_interest: "breast_surgery",
                    preferred_date: "2026-06-20",
                    client_country: "United Kingdom",
                    destination_country: "Thailand",
                    age: "29",
                    gender: "Female",
                    medical_conditions: ["Asthma"],
                    takes_medications: true,
                    medication_types: ["Albuterol"],
                    allergies: ["Latex"],
                    smoking_status: false,
                    has_companion: true,
                    companion_relationship: "Friend",
                    duration_of_stay: "14 days",
                    passport_number: "GB456789123",
                    passport_expiry_date: "2029-03-15"
                },
                {
                    patient_name: "James Rodriguez",
                    email: "j.rodriguez@example.com",
                    phone: "+1-305-7946-0958",
                    procedure_interest: "gastric_sleeve",
                    preferred_date: "2026-09-10",
                    client_country: "United States",
                    destination_country: "Mexico",
                    age: "52",
                    gender: "Male",
                    medical_conditions: ["Type 2 Diabetes", "Obesity"],
                    takes_medications: true,
                    medication_types: ["Metformin", "Insulin"],
                    allergies: ["Sulfa"],
                    smoking_status: false,
                    has_companion: true,
                    companion_relationship: "Wife",
                    duration_of_stay: "12 days",
                    passport_number: "US789123456",
                    passport_expiry_date: "2027-08-22"
                },
                {
                    patient_name: "Olivia Martinez",
                    email: "olivia.m@example.com",
                    phone: "+1-555-0105",
                    procedure_interest: "smile_makeover",
                    preferred_date: "2026-07-05",
                    client_country: "United States",
                    destination_country: "Costa Rica",
                    age: "38",
                    gender: "Female",
                    medical_conditions: [],
                    takes_medications: false,
                    medication_types: [],
                    allergies: ["None"],
                    smoking_status: false,
                    has_companion: false,
                    companion_relationship: "",
                    duration_of_stay: "8 days",
                    passport_number: "US321654987",
                    passport_expiry_date: "2028-12-01"
                }
            ],
            doctors: [
                {
                    full_name: "Dr. Carlos Mendez",
                    email: "carlos.mendez@clinicexample.com",
                    phone: "+506-2222-3333",
                    clinic_country: "Costa Rica",
                    clinic_city: "San José",
                    clinic_name: "San José Dental Institute",
                    professional_background: "DDS from University of Costa Rica, 15 years experience in dental implants",
                    years_experience: 15,
                    bio: "Specialist in advanced dental implantology and full mouth rehabilitation",
                    language_preference: "es",
                    status: "active",
                    rating: 4.9,
                    successful_procedures_count: 450
                },
                {
                    full_name: "Dr. Maria Santos",
                    email: "maria.santos@plasticsurgery.mx",
                    phone: "+52-55-1234-5678",
                    clinic_country: "Mexico",
                    clinic_city: "Mexico City",
                    clinic_name: "Mexico City Plastic Surgery Center",
                    professional_background: "Board-certified plastic surgeon, trained in Brazil and USA",
                    years_experience: 12,
                    bio: "Expert in rhinoplasty, breast surgery, and body contouring procedures",
                    language_preference: "es",
                    status: "active",
                    rating: 4.8,
                    successful_procedures_count: 380
                },
                {
                    full_name: "Dr. Somchai Patel",
                    email: "somchai.p@bangkokmedical.th",
                    phone: "+66-2-123-4567",
                    clinic_country: "Thailand",
                    clinic_city: "Bangkok",
                    clinic_name: "Bangkok Medical Center",
                    professional_background: "MBBS, FRCS, 20 years in cosmetic and reconstructive surgery",
                    years_experience: 20,
                    bio: "Internationally recognized surgeon specializing in breast augmentation and body sculpting",
                    language_preference: "en",
                    status: "active",
                    rating: 5.0,
                    successful_procedures_count: 620
                }
            ],
            travelAgencies: [
                {
                    agency_name: "Caribbean Medical Travel",
                    contact_person: "Linda Thompson",
                    email: "linda@caribbeanmedicaltravel.com",
                    phone: "+1-800-555-0199",
                    website_url: "https://caribbeanmedicaltravel.com",
                    headquarters_country: "United States",
                    medical_travel_experience_years: 8,
                    emergency_support_available: true,
                    service_regions: ["Caribbean", "North America", "Central America"],
                    services_offered: ["Flights", "Hotels", "Airport Transfers", "Clinic Coordination"],
                    language_preference: "en",
                    status: "active",
                    rating: 4.7
                },
                {
                    agency_name: "Mexico Health Tourism",
                    contact_person: "Roberto Garcia",
                    email: "roberto@mexicohealthtourism.mx",
                    phone: "+52-55-9876-5432",
                    website_url: "https://mexicohealthtourism.mx",
                    headquarters_country: "Mexico",
                    medical_travel_experience_years: 12,
                    emergency_support_available: true,
                    service_regions: ["North America", "Central America", "Mexico"],
                    services_offered: ["Flights", "Hotels", "Airport Transfers", "Clinic Coordination", "Visa Assistance"],
                    language_preference: "es",
                    status: "active",
                    rating: 4.8
                }
            ],
            taxiServices: [
                {
                    company_name: "San José Medical Transport",
                    driver_name: "Juan Pablo Morales",
                    email: "juanpablo@sjmedicaltransport.cr",
                    phone: "+506-8888-9999",
                    operating_country: "Costa Rica",
                    operating_city: "San José",
                    service_radius_km: 50,
                    patient_assistance: ["Luggage help", "Mobility help", "Wheelchair support"],
                    vehicle_types: ["Sedan", "Van", "Wheelchair van"],
                    language_preference: "es",
                    status: "active",
                    is_online: true,
                    quality_score: 4.9,
                    total_trips: 245
                },
                {
                    company_name: "Bangkok Patient Ride",
                    driver_name: "Niran Sukhumvit",
                    email: "niran@bangkokpatientride.th",
                    phone: "+66-89-123-4567",
                    operating_country: "Thailand",
                    operating_city: "Bangkok",
                    service_radius_km: 40,
                    patient_assistance: ["Luggage help", "Mobility help"],
                    vehicle_types: ["Sedan", "SUV", "Van"],
                    language_preference: "en",
                    status: "active",
                    is_online: true,
                    quality_score: 4.8,
                    total_trips: 312
                },
                {
                    company_name: "Mexico City Medical Cab",
                    driver_name: "Alejandro Hernandez",
                    email: "alejandro@mexicocitymedcab.mx",
                    phone: "+52-55-7777-8888",
                    operating_country: "Mexico",
                    operating_city: "Mexico City",
                    service_radius_km: 60,
                    patient_assistance: ["Luggage help", "Mobility help", "Wheelchair support"],
                    vehicle_types: ["Sedan", "Van"],
                    language_preference: "es",
                    status: "active",
                    is_online: false,
                    quality_score: 4.7,
                    total_trips: 189
                }
            ],
            companions: [
                {
                    full_name: "Maria Lopez",
                    email: "maria.lopez@companions.com",
                    phone: "+34-91-555-0123",
                    country: "Spain",
                    city: "Madrid",
                    languages: ["Spanish", "English", "French"],
                    primary_language: "es",
                    certifications: ["First Aid", "Medical Assistant"],
                    specializations: ["Medical Tourism", "Cultural Tours"],
                    years_experience: 8,
                    bio: "Experienced medical travel companion with expertise in supporting international patients",
                    hourly_rate_usd: 35,
                    daily_rate_usd: 250,
                    service_regions: ["Europe", "North Africa"],
                    available_for_medical_procedures: true,
                    medical_training: "Certified Medical Assistant",
                    payout_method: "stripe",
                    status: "active",
                    rating: 4.9,
                    review_count: 24,
                    total_bookings: 45,
                    is_available: true
                },
                {
                    full_name: "James Mitchell",
                    email: "james.mitchell@companions.com",
                    phone: "+44-20-7946-0124",
                    country: "United Kingdom",
                    city: "London",
                    languages: ["English", "German"],
                    primary_language: "en",
                    certifications: ["Tour Guide", "First Aid"],
                    specializations: ["Cultural Tours", "Adventure"],
                    years_experience: 6,
                    bio: "Cultural guide and medical companion for European destinations",
                    hourly_rate_usd: 40,
                    daily_rate_usd: 280,
                    service_regions: ["Europe"],
                    available_for_medical_procedures: false,
                    medical_training: "Basic First Aid Certified",
                    payout_method: "stripe",
                    status: "active",
                    rating: 4.8,
                    review_count: 18,
                    total_bookings: 32,
                    is_available: true
                },
                {
                    full_name: "Sophie Dubois",
                    email: "sophie.dubois@companions.com",
                    phone: "+33-1-5555-0125",
                    country: "France",
                    city: "Paris",
                    languages: ["French", "English", "Spanish"],
                    primary_language: "fr",
                    certifications: ["Nursing Assistant", "Tour Guide"],
                    specializations: ["Medical Tourism", "Wellness Retreats"],
                    years_experience: 10,
                    bio: "Former nurse specializing in post-operative care and medical tourism support",
                    hourly_rate_usd: 45,
                    daily_rate_usd: 320,
                    service_regions: ["Europe", "Caribbean"],
                    available_for_medical_procedures: true,
                    medical_training: "Licensed Nursing Assistant",
                    payout_method: "stripe",
                    status: "active",
                    rating: 5.0,
                    review_count: 31,
                    total_bookings: 58,
                    is_available: true
                }
            ]
        };

        // Create consultations
        const createdConsultations = await base44.asServiceRole.entities.Consultation.bulkCreate(mockData.consultations);
        
        // Create doctors
        const createdDoctors = await base44.asServiceRole.entities.Doctor.bulkCreate(mockData.doctors);
        
        // Create travel agencies
        const createdTravelAgencies = await base44.asServiceRole.entities.TravelAgency.bulkCreate(mockData.travelAgencies);
        
        // Create taxi services
        const createdTaxiServices = await base44.asServiceRole.entities.TaxiService.bulkCreate(mockData.taxiServices);
        
        // Create companions
        const createdCompanions = await base44.asServiceRole.entities.Companion.bulkCreate(mockData.companions);

        return Response.json({
            success: true,
            message: "Sample data populated successfully",
            counts: {
                consultations: createdConsultations.length,
                doctors: createdDoctors.length,
                travelAgencies: createdTravelAgencies.length,
                taxiServices: createdTaxiServices.length,
                companions: createdCompanions.length
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});