--
-- PostgreSQL database dump
--

\restrict 3WUuHK12Sert86H0t6cJaj4oZLTTFN6uR9if6aik9InpkO0PGC5mm9Di3c84gPS

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ad_inquiries; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.ad_inquiries (
    id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    company_name text,
    message text NOT NULL,
    status character varying(20),
    created_at timestamp without time zone
);


ALTER TABLE public.ad_inquiries OWNER TO mzansi;

--
-- Name: adverts; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.adverts (
    id character varying(36) NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    image_url text NOT NULL,
    target_url text NOT NULL,
    status character varying(20),
    placement_section character varying(50) NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    clicks integer,
    impressions integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.adverts OWNER TO mzansi;

--
-- Name: agent_commissions; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.agent_commissions (
    id uuid NOT NULL,
    agent_id uuid NOT NULL,
    recruited_user_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text,
    status text,
    created_at timestamp with time zone,
    paid_at timestamp with time zone
);


ALTER TABLE public.agent_commissions OWNER TO mzansi;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.agents (
    id uuid NOT NULL,
    name text NOT NULL,
    surname text NOT NULL,
    id_number text,
    agent_id text NOT NULL,
    phone text,
    municipality text,
    ward text,
    created_at timestamp with time zone
);


ALTER TABLE public.agents OWNER TO mzansi;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO mzansi;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value json NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.app_settings OWNER TO mzansi;

--
-- Name: carousel_items; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.carousel_items (
    id uuid NOT NULL,
    image_url text,
    cta_link text,
    cta_text character varying(120),
    "order" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    title character varying(255),
    subtitle text,
    badge character varying(50),
    cta_color character varying(100)
);


ALTER TABLE public.carousel_items OWNER TO mzansi;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    request_id text NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean,
    created_at timestamp with time zone
);


ALTER TABLE public.chat_messages OWNER TO mzansi;

--
-- Name: client_ratings; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.client_ratings (
    id uuid NOT NULL,
    service_request_id text NOT NULL,
    client_id uuid NOT NULL,
    rater_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp with time zone,
    CONSTRAINT client_rating_check_range CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.client_ratings OWNER TO mzansi;

--
-- Name: countries; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.countries (
    id uuid NOT NULL,
    name text NOT NULL,
    code text,
    is_active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.countries OWNER TO mzansi;

--
-- Name: delivery_addresses; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.delivery_addresses (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    street_address text NOT NULL,
    city text NOT NULL,
    province text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL,
    unit_number text,
    building_name text,
    delivery_instructions text,
    is_default boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.delivery_addresses OWNER TO mzansi;

--
-- Name: driver_ratings; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.driver_ratings (
    id uuid NOT NULL,
    service_request_id text NOT NULL,
    driver_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp with time zone,
    CONSTRAINT check_rating_range CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.driver_ratings OWNER TO mzansi;

--
-- Name: earnings_recon; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.earnings_recon (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    period_month text NOT NULL,
    role text NOT NULL,
    earnings_amount numeric(10,2) NOT NULL,
    transferred_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT check_recon_role CHECK ((role = ANY (ARRAY['driver'::text, 'professional'::text, 'service-provider'::text])))
);


ALTER TABLE public.earnings_recon OWNER TO mzansi;

--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.email_verification_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean,
    created_at timestamp with time zone
);


ALTER TABLE public.email_verification_tokens OWNER TO mzansi;

--
-- Name: emails; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.emails (
    id uuid NOT NULL,
    recipient text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    body_html text,
    status text,
    sent_at timestamp with time zone,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT check_email_status CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


ALTER TABLE public.emails OWNER TO mzansi;

--
-- Name: external_api_logs; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.external_api_logs (
    id uuid NOT NULL,
    provider text NOT NULL,
    endpoint text NOT NULL,
    method text NOT NULL,
    request_payload jsonb,
    response_payload jsonb,
    status_code integer,
    error_message text,
    created_at timestamp with time zone
);


ALTER TABLE public.external_api_logs OWNER TO mzansi;

--
-- Name: faqs; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.faqs (
    id uuid NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    "order" integer,
    is_active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.faqs OWNER TO mzansi;

--
-- Name: footer_content; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.footer_content (
    id integer NOT NULL,
    company_name character varying(255),
    email character varying(255),
    phone character varying(80),
    physical_address text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.footer_content OWNER TO mzansi;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.inventory (
    id text NOT NULL,
    product_id text NOT NULL,
    quantity integer NOT NULL,
    reserved_quantity integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.inventory OWNER TO mzansi;

--
-- Name: landing_features; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.landing_features (
    id uuid NOT NULL,
    icon character varying(60),
    title character varying(120) NOT NULL,
    description text NOT NULL,
    "order" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.landing_features OWNER TO mzansi;

--
-- Name: marketplace_ads; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.marketplace_ads (
    id character varying(36) NOT NULL,
    user_id uuid NOT NULL,
    category_id character varying(36) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    price numeric(12,2),
    city character varying(100) NOT NULL,
    province character varying(100) NOT NULL,
    status character varying(20),
    condition character varying(50),
    images jsonb,
    contact_name character varying(100),
    contact_phone character varying(20),
    contact_email character varying(100),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.marketplace_ads OWNER TO mzansi;

--
-- Name: marketplace_categories; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.marketplace_categories (
    id character varying(36) NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    icon character varying(50),
    description text,
    created_at timestamp without time zone
);


ALTER TABLE public.marketplace_categories OWNER TO mzansi;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    status text,
    entity_type text,
    entity_id text,
    created_at timestamp with time zone,
    CONSTRAINT check_notification_status CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text])))
);


ALTER TABLE public.notifications OWNER TO mzansi;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.orders (
    id text NOT NULL,
    customer_id uuid,
    customer_email text,
    status text NOT NULL,
    total numeric(10,2) NOT NULL,
    items jsonb NOT NULL,
    shipping jsonb,
    payment_id text,
    placed_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT check_order_status CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);


ALTER TABLE public.orders OWNER TO mzansi;

--
-- Name: otp_challenges; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.otp_challenges (
    id uuid NOT NULL,
    user_id uuid,
    purpose text NOT NULL,
    channel text NOT NULL,
    identifier text NOT NULL,
    code_hash text,
    firebase_uid text,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    used boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone,
    metadata jsonb,
    CONSTRAINT check_otp_channel CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text]))),
    CONSTRAINT check_otp_purpose CHECK ((purpose = ANY (ARRAY['login'::text, 'payout'::text, 'password_reset'::text, 'payment_verification'::text])))
);


ALTER TABLE public.otp_challenges OWNER TO mzansi;

--
-- Name: panic_alerts; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.panic_alerts (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    booking_id text,
    latitude double precision,
    longitude double precision,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    resolved_by_id uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    admin_email_sent boolean DEFAULT false NOT NULL,
    next_of_kin_email_sent boolean DEFAULT false NOT NULL,
    armed_response_ref character varying(100),
    armed_response_status character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.panic_alerts OWNER TO mzansi;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean,
    created_at timestamp with time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO mzansi;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.payments (
    id uuid NOT NULL,
    external_id text,
    amount numeric(10,2) NOT NULL,
    currency text NOT NULL,
    status text NOT NULL,
    payment_method text,
    payment_provider_id text,
    metadata jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT check_payment_status CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text])))
);


ALTER TABLE public.payments OWNER TO mzansi;

--
-- Name: pending_profile_updates; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.pending_profile_updates (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by_id uuid,
    rejection_reason text
);


ALTER TABLE public.pending_profile_updates OWNER TO mzansi;

--
-- Name: product_images; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.product_images (
    id uuid NOT NULL,
    product_id text NOT NULL,
    image_url text NOT NULL,
    is_primary boolean,
    "order" integer,
    created_at timestamp with time zone
);


ALTER TABLE public.product_images OWNER TO mzansi;

--
-- Name: professional_ratings; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.professional_ratings (
    id uuid NOT NULL,
    service_request_id text NOT NULL,
    professional_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp with time zone,
    CONSTRAINT professional_rating_check_range CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.professional_ratings OWNER TO mzansi;

--
-- Name: provider_ratings; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.provider_ratings (
    id uuid NOT NULL,
    service_request_id text NOT NULL,
    provider_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp with time zone,
    CONSTRAINT provider_rating_check_range CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.provider_ratings OWNER TO mzansi;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.reports (
    id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    reported_user_id uuid,
    service_request_id text,
    reason text NOT NULL,
    description text NOT NULL,
    status text,
    created_at timestamp with time zone,
    resolved_at timestamp with time zone,
    admin_notes text
);


ALTER TABLE public.reports OWNER TO mzansi;

--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.service_requests (
    id text NOT NULL,
    request_type text NOT NULL,
    status text NOT NULL,
    requester_id uuid,
    provider_id uuid,
    scheduled_date text,
    scheduled_time text,
    location_data jsonb,
    distance_km numeric(10,2),
    details jsonb,
    payment_status text,
    payment_amount numeric(10,2),
    payment_currency text,
    bid_amount numeric(10,2),
    quote_amount numeric(10,2),
    cancellation_charge numeric(10,2),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT check_payment_status CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text]))),
    CONSTRAINT check_request_type CHECK ((request_type = ANY (ARRAY['cab'::text, 'professional'::text, 'provider'::text]))),
    CONSTRAINT check_status CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'completed'::text, 'cancelled'::text, 'unpaid'::text])))
);


ALTER TABLE public.service_requests OWNER TO mzansi;

--
-- Name: service_types; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.service_types (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    is_active boolean,
    "order" integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT check_service_category CHECK ((category = ANY (ARRAY['professional'::text, 'service-provider'::text, 'driver'::text])))
);


ALTER TABLE public.service_types OWNER TO mzansi;

--
-- Name: shop_categories; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.shop_categories (
    id text NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.shop_categories OWNER TO mzansi;

--
-- Name: shop_products; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.shop_products (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category_id text,
    in_stock boolean,
    image_url text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    status text NOT NULL,
    subcategory_id text,
    product_type text NOT NULL,
    attributes jsonb,
    variations jsonb,
    grouped_products jsonb,
    external_url text,
    button_text text,
    CONSTRAINT check_product_status CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


ALTER TABLE public.shop_products OWNER TO mzansi;

--
-- Name: shop_subcategories; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.shop_subcategories (
    id text NOT NULL,
    category_id text NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.shop_subcategories OWNER TO mzansi;

--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.subscription_plans (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    currency text NOT NULL,
    "interval" text NOT NULL,
    paypal_plan_id text,
    is_active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.subscription_plans OWNER TO mzansi;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.subscriptions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    provider text NOT NULL,
    provider_subscription_id text,
    status text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean,
    metadata jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.subscriptions OWNER TO mzansi;

--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.testimonials (
    id uuid NOT NULL,
    name character varying(120) NOT NULL,
    role character varying(120),
    avatar_url text,
    rating integer DEFAULT 5,
    text text NOT NULL,
    "order" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.testimonials OWNER TO mzansi;

--
-- Name: user_selected_services; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.user_selected_services (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    service_type_id uuid NOT NULL,
    personalized_description text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.user_selected_services OWNER TO mzansi;

--
-- Name: users; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email public.citext NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    is_admin boolean,
    is_paid boolean,
    is_approved boolean,
    is_active boolean,
    email_verified boolean,
    tracking_number text,
    data jsonb,
    file_urls jsonb,
    id_verification_status text,
    id_rejection_reason text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    nationality text,
    profile_image_url text,
    agent_id uuid,
    aura_id text,
    aura_status text,
    registration_rejection_reason text,
    registration_review_status text DEFAULT 'pending'::text,
    CONSTRAINT check_id_verification_status CHECK ((id_verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text]))),
    CONSTRAINT check_role CHECK ((role = ANY (ARRAY['client'::text, 'driver'::text, 'professional'::text, 'service-provider'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO mzansi;

--
-- Name: vehicle_images; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.vehicle_images (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    car_index integer NOT NULL,
    image_url text NOT NULL
);


ALTER TABLE public.vehicle_images OWNER TO mzansi;

--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.wallet_transactions (
    id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    user_id uuid,
    transaction_type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text NOT NULL,
    balance_before numeric(10,2) NOT NULL,
    balance_after numeric(10,2) NOT NULL,
    external_id text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone,
    CONSTRAINT check_transaction_type CHECK ((transaction_type = ANY (ARRAY['top-up'::text, 'payment'::text, 'refund'::text, 'cancellation_refund'::text, 'withdrawal'::text, 'earnings_transfer'::text, 'withdrawal_reversal'::text])))
);


ALTER TABLE public.wallet_transactions OWNER TO mzansi;

--
-- Name: wallets; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.wallets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    balance numeric(10,2) NOT NULL,
    currency text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT check_balance_non_negative CHECK ((balance >= (0)::numeric))
);


ALTER TABLE public.wallets OWNER TO mzansi;

--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: mzansi
--

CREATE TABLE public.withdrawal_requests (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone,
    processed_at timestamp with time zone,
    admin_notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    banking_details jsonb,
    CONSTRAINT check_withdrawal_status CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'reversed'::text])))
);


ALTER TABLE public.withdrawal_requests OWNER TO mzansi;

--
-- Data for Name: ad_inquiries; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.ad_inquiries (id, full_name, email, company_name, message, status, created_at) FROM stdin;
\.


--
-- Data for Name: adverts; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.adverts (id, user_id, title, image_url, target_url, status, placement_section, start_date, end_date, clicks, impressions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agent_commissions; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.agent_commissions (id, agent_id, recruited_user_id, amount, currency, status, created_at, paid_at) FROM stdin;
\.


--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.agents (id, name, surname, id_number, agent_id, phone, municipality, ward, created_at) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.alembic_version (version_num) FROM stdin;
merge_otp_panic_heads
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.app_settings (key, value, created_at, updated_at) FROM stdin;
payment_paypal	{"client_id": "", "client_secret": "", "enabled": true, "mode": "sandbox"}	2026-04-01 14:27:52.31429+00	2026-04-01 14:27:52.314294+00
payment_yoco	{"api_url": "https://payments.yoco.com", "enabled": true, "secret_key": ""}	2026-04-01 14:27:52.316349+00	2026-04-01 14:27:52.316352+00
\.


--
-- Data for Name: carousel_items; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.carousel_items (id, image_url, cta_link, cta_text, "order", is_active, created_at, updated_at, title, subtitle, badge, cta_color) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.chat_messages (id, request_id, sender_id, recipient_id, message, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: client_ratings; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.client_ratings (id, service_request_id, client_id, rater_id, rating, review_text, created_at) FROM stdin;
\.


--
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.countries (id, name, code, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: delivery_addresses; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.delivery_addresses (id, user_id, street_address, city, province, postal_code, country, unit_number, building_name, delivery_instructions, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: driver_ratings; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.driver_ratings (id, service_request_id, driver_id, requester_id, rating, review_text, created_at) FROM stdin;
\.


--
-- Data for Name: earnings_recon; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.earnings_recon (id, user_id, period_month, role, earnings_amount, transferred_at, created_at) FROM stdin;
\.


--
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.email_verification_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: emails; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.emails (id, recipient, subject, body, body_html, status, sent_at, error_message, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: external_api_logs; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.external_api_logs (id, provider, endpoint, method, request_payload, response_payload, status_code, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: faqs; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.faqs (id, question, answer, "order", is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: footer_content; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.footer_content (id, company_name, email, phone, physical_address, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.inventory (id, product_id, quantity, reserved_quantity, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: landing_features; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.landing_features (id, icon, title, description, "order", is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketplace_ads; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.marketplace_ads (id, user_id, category_id, title, description, price, city, province, status, condition, images, contact_name, contact_phone, contact_email, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketplace_categories; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.marketplace_categories (id, name, slug, icon, description, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.notifications (id, user_id, type, title, body, status, entity_type, entity_id, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.orders (id, customer_id, customer_email, status, total, items, shipping, payment_id, placed_at, updated_at) FROM stdin;
\.


--
-- Data for Name: otp_challenges; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.otp_challenges (id, user_id, purpose, channel, identifier, code_hash, firebase_uid, attempts, max_attempts, used, expires_at, verified_at, created_at, metadata) FROM stdin;
\.


--
-- Data for Name: panic_alerts; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.panic_alerts (id, user_id, booking_id, latitude, longitude, status, resolved_by_id, resolved_at, resolution_notes, admin_email_sent, next_of_kin_email_sent, armed_response_ref, armed_response_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.payments (id, external_id, amount, currency, status, payment_method, payment_provider_id, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pending_profile_updates; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.pending_profile_updates (id, user_id, payload, status, created_at, reviewed_at, reviewed_by_id, rejection_reason) FROM stdin;
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.product_images (id, product_id, image_url, is_primary, "order", created_at) FROM stdin;
\.


--
-- Data for Name: professional_ratings; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.professional_ratings (id, service_request_id, professional_id, requester_id, rating, review_text, created_at) FROM stdin;
\.


--
-- Data for Name: provider_ratings; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.provider_ratings (id, service_request_id, provider_id, requester_id, rating, review_text, created_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.reports (id, reporter_id, reported_user_id, service_request_id, reason, description, status, created_at, resolved_at, admin_notes) FROM stdin;
\.


--
-- Data for Name: service_requests; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.service_requests (id, request_type, status, requester_id, provider_id, scheduled_date, scheduled_time, location_data, distance_km, details, payment_status, payment_amount, payment_currency, bid_amount, quote_amount, cancellation_charge, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_types; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.service_types (id, name, description, category, is_active, "order", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: shop_categories; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.shop_categories (id, title, created_at) FROM stdin;
\.


--
-- Data for Name: shop_products; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.shop_products (id, name, description, price, category_id, in_stock, image_url, created_at, updated_at, status, subcategory_id, product_type, attributes, variations, grouped_products, external_url, button_text) FROM stdin;
\.


--
-- Data for Name: shop_subcategories; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.shop_subcategories (id, category_id, title, created_at) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.subscription_plans (id, name, description, price, currency, "interval", paypal_plan_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.subscriptions (id, user_id, plan_id, provider, provider_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: testimonials; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.testimonials (id, name, role, avatar_url, rating, text, "order", is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_selected_services; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.user_selected_services (id, user_id, service_type_id, personalized_description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.users (id, email, password_hash, role, is_admin, is_paid, is_approved, is_active, email_verified, tracking_number, data, file_urls, id_verification_status, id_rejection_reason, created_at, updated_at, nationality, profile_image_url, agent_id, aura_id, aura_status, registration_rejection_reason, registration_review_status) FROM stdin;
f00fe5db-cdde-497b-a4d4-082b2efe363e	ntshabelengt@gmail.com	$2b$12$KfXdLJTadgRdP.LS8NdHjeWDagMFGYB0PtfIBAbYIiSx95Dgcgnt.	admin	t	t	t	t	t	TRK-1F1AECA25B85	{"full_name": "Thabang Ntshabeleng"}	[]	pending	\N	2026-04-01 13:39:49.493449+00	2026-06-24 11:45:59.468923+00	\N	\N	\N	\N	\N	\N	pending
\.


--
-- Data for Name: vehicle_images; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.vehicle_images (id, user_id, car_index, image_url) FROM stdin;
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.wallet_transactions (id, wallet_id, user_id, transaction_type, amount, currency, balance_before, balance_after, external_id, description, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.wallets (id, user_id, balance, currency, created_at, updated_at) FROM stdin;
9df2c4c3-baee-464f-a737-1ab2d3af4fdf	f00fe5db-cdde-497b-a4d4-082b2efe363e	0.00	ZAR	2026-06-24 11:45:59.516711+00	2026-06-24 11:45:59.516715+00
\.


--
-- Data for Name: withdrawal_requests; Type: TABLE DATA; Schema: public; Owner: mzansi
--

COPY public.withdrawal_requests (id, user_id, amount, status, requested_at, processed_at, admin_notes, created_at, updated_at, banking_details) FROM stdin;
\.


--
-- Name: ad_inquiries ad_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.ad_inquiries
    ADD CONSTRAINT ad_inquiries_pkey PRIMARY KEY (id);


--
-- Name: adverts adverts_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.adverts
    ADD CONSTRAINT adverts_pkey PRIMARY KEY (id);


--
-- Name: agent_commissions agent_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.agent_commissions
    ADD CONSTRAINT agent_commissions_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: carousel_items carousel_items_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.carousel_items
    ADD CONSTRAINT carousel_items_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: client_ratings client_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.client_ratings
    ADD CONSTRAINT client_ratings_pkey PRIMARY KEY (id);


--
-- Name: countries countries_code_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);


--
-- Name: countries countries_name_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_name_key UNIQUE (name);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: delivery_addresses delivery_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.delivery_addresses
    ADD CONSTRAINT delivery_addresses_pkey PRIMARY KEY (id);


--
-- Name: driver_ratings driver_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.driver_ratings
    ADD CONSTRAINT driver_ratings_pkey PRIMARY KEY (id);


--
-- Name: earnings_recon earnings_recon_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.earnings_recon
    ADD CONSTRAINT earnings_recon_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: external_api_logs external_api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.external_api_logs
    ADD CONSTRAINT external_api_logs_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: footer_content footer_content_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.footer_content
    ADD CONSTRAINT footer_content_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_product_id_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_product_id_key UNIQUE (product_id);


--
-- Name: landing_features landing_features_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.landing_features
    ADD CONSTRAINT landing_features_pkey PRIMARY KEY (id);


--
-- Name: marketplace_ads marketplace_ads_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.marketplace_ads
    ADD CONSTRAINT marketplace_ads_pkey PRIMARY KEY (id);


--
-- Name: marketplace_categories marketplace_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.marketplace_categories
    ADD CONSTRAINT marketplace_categories_name_key UNIQUE (name);


--
-- Name: marketplace_categories marketplace_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.marketplace_categories
    ADD CONSTRAINT marketplace_categories_pkey PRIMARY KEY (id);


--
-- Name: marketplace_categories marketplace_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.marketplace_categories
    ADD CONSTRAINT marketplace_categories_slug_key UNIQUE (slug);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: otp_challenges otp_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.otp_challenges
    ADD CONSTRAINT otp_challenges_pkey PRIMARY KEY (id);


--
-- Name: panic_alerts panic_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.panic_alerts
    ADD CONSTRAINT panic_alerts_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: payments payments_external_id_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_external_id_key UNIQUE (external_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pending_profile_updates pending_profile_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.pending_profile_updates
    ADD CONSTRAINT pending_profile_updates_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: professional_ratings professional_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.professional_ratings
    ADD CONSTRAINT professional_ratings_pkey PRIMARY KEY (id);


--
-- Name: provider_ratings provider_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.provider_ratings
    ADD CONSTRAINT provider_ratings_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- Name: service_types service_types_name_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.service_types
    ADD CONSTRAINT service_types_name_key UNIQUE (name);


--
-- Name: service_types service_types_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.service_types
    ADD CONSTRAINT service_types_pkey PRIMARY KEY (id);


--
-- Name: shop_categories shop_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.shop_categories
    ADD CONSTRAINT shop_categories_pkey PRIMARY KEY (id);


--
-- Name: shop_products shop_products_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_pkey PRIMARY KEY (id);


--
-- Name: shop_subcategories shop_subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.shop_subcategories
    ADD CONSTRAINT shop_subcategories_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_paypal_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_paypal_plan_id_key UNIQUE (paypal_plan_id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_provider_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_provider_subscription_id_key UNIQUE (provider_subscription_id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: user_selected_services unique_user_service; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.user_selected_services
    ADD CONSTRAINT unique_user_service UNIQUE (user_id, service_type_id);


--
-- Name: earnings_recon uq_earnings_recon_user_period; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.earnings_recon
    ADD CONSTRAINT uq_earnings_recon_user_period UNIQUE (user_id, period_month);


--
-- Name: users uq_user_email_role; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_user_email_role UNIQUE (email, role);


--
-- Name: user_selected_services user_selected_services_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.user_selected_services
    ADD CONSTRAINT user_selected_services_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_tracking_number_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tracking_number_key UNIQUE (tracking_number);


--
-- Name: vehicle_images vehicle_images_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.vehicle_images
    ADD CONSTRAINT vehicle_images_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_otp_challenges_identifier; Type: INDEX; Schema: public; Owner: mzansi
--

CREATE INDEX idx_otp_challenges_identifier ON public.otp_challenges USING btree (identifier);


--
-- Name: idx_otp_challenges_user_purpose; Type: INDEX; Schema: public; Owner: mzansi
--

CREATE INDEX idx_otp_challenges_user_purpose ON public.otp_challenges USING btree (user_id, purpose);


--
-- Name: ix_agents_agent_id; Type: INDEX; Schema: public; Owner: mzansi
--

CREATE UNIQUE INDEX ix_agents_agent_id ON public.agents USING btree (agent_id);


--
-- Name: ix_panic_alerts_created_at; Type: INDEX; Schema: public; Owner: mzansi
--

CREATE INDEX ix_panic_alerts_created_at ON public.panic_alerts USING btree (created_at);


--
-- Name: ix_panic_alerts_status; Type: INDEX; Schema: public; Owner: mzansi
--

CREATE INDEX ix_panic_alerts_status ON public.panic_alerts USING btree (status);


--
-- Name: ix_panic_alerts_user_id; Type: INDEX; Schema: public; Owner: mzansi
--

CREATE INDEX ix_panic_alerts_user_id ON public.panic_alerts USING btree (user_id);


--
-- Name: ix_pending_profile_updates_user_id; Type: INDEX; Schema: public; Owner: mzansi
--

CREATE INDEX ix_pending_profile_updates_user_id ON public.pending_profile_updates USING btree (user_id);


--
-- Name: ix_vehicle_images_user_id; Type: INDEX; Schema: public; Owner: mzansi
--

CREATE INDEX ix_vehicle_images_user_id ON public.vehicle_images USING btree (user_id);


--
-- Name: adverts adverts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.adverts
    ADD CONSTRAINT adverts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: agent_commissions agent_commissions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.agent_commissions
    ADD CONSTRAINT agent_commissions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_commissions agent_commissions_recruited_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.agent_commissions
    ADD CONSTRAINT agent_commissions_recruited_user_id_fkey FOREIGN KEY (recruited_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_ratings client_ratings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.client_ratings
    ADD CONSTRAINT client_ratings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_ratings client_ratings_rater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.client_ratings
    ADD CONSTRAINT client_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_ratings client_ratings_service_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.client_ratings
    ADD CONSTRAINT client_ratings_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;


--
-- Name: delivery_addresses delivery_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.delivery_addresses
    ADD CONSTRAINT delivery_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driver_ratings driver_ratings_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.driver_ratings
    ADD CONSTRAINT driver_ratings_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driver_ratings driver_ratings_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.driver_ratings
    ADD CONSTRAINT driver_ratings_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driver_ratings driver_ratings_service_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.driver_ratings
    ADD CONSTRAINT driver_ratings_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;


--
-- Name: earnings_recon earnings_recon_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.earnings_recon
    ADD CONSTRAINT earnings_recon_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.shop_products(id) ON DELETE CASCADE;


--
-- Name: marketplace_ads marketplace_ads_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.marketplace_ads
    ADD CONSTRAINT marketplace_ads_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.marketplace_categories(id);


--
-- Name: marketplace_ads marketplace_ads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.marketplace_ads
    ADD CONSTRAINT marketplace_ads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: otp_challenges otp_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.otp_challenges
    ADD CONSTRAINT otp_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: panic_alerts panic_alerts_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.panic_alerts
    ADD CONSTRAINT panic_alerts_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.service_requests(id) ON DELETE SET NULL;


--
-- Name: panic_alerts panic_alerts_resolved_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.panic_alerts
    ADD CONSTRAINT panic_alerts_resolved_by_id_fkey FOREIGN KEY (resolved_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: panic_alerts panic_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.panic_alerts
    ADD CONSTRAINT panic_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pending_profile_updates pending_profile_updates_reviewed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.pending_profile_updates
    ADD CONSTRAINT pending_profile_updates_reviewed_by_id_fkey FOREIGN KEY (reviewed_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pending_profile_updates pending_profile_updates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.pending_profile_updates
    ADD CONSTRAINT pending_profile_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.shop_products(id) ON DELETE CASCADE;


--
-- Name: professional_ratings professional_ratings_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.professional_ratings
    ADD CONSTRAINT professional_ratings_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: professional_ratings professional_ratings_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.professional_ratings
    ADD CONSTRAINT professional_ratings_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: professional_ratings professional_ratings_service_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.professional_ratings
    ADD CONSTRAINT professional_ratings_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;


--
-- Name: provider_ratings provider_ratings_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.provider_ratings
    ADD CONSTRAINT provider_ratings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_ratings provider_ratings_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.provider_ratings
    ADD CONSTRAINT provider_ratings_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_ratings provider_ratings_service_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.provider_ratings
    ADD CONSTRAINT provider_ratings_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;


--
-- Name: reports reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_service_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE SET NULL;


--
-- Name: service_requests service_requests_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: service_requests service_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shop_products shop_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.shop_categories(id) ON DELETE SET NULL;


--
-- Name: shop_products shop_products_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.shop_subcategories(id) ON DELETE SET NULL;


--
-- Name: shop_subcategories shop_subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.shop_subcategories
    ADD CONSTRAINT shop_subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.shop_categories(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_selected_services user_selected_services_service_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.user_selected_services
    ADD CONSTRAINT user_selected_services_service_type_id_fkey FOREIGN KEY (service_type_id) REFERENCES public.service_types(id) ON DELETE CASCADE;


--
-- Name: user_selected_services user_selected_services_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.user_selected_services
    ADD CONSTRAINT user_selected_services_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: vehicle_images vehicle_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.vehicle_images
    ADD CONSTRAINT vehicle_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: withdrawal_requests withdrawal_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mzansi
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 3WUuHK12Sert86H0t6cJaj4oZLTTFN6uR9if6aik9InpkO0PGC5mm9Di3c84gPS

