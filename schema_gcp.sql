--
-- PostgreSQL database dump
--


-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 17.7 (Homebrew)

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
-- Name: asset_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_kind AS ENUM (
    'SWOT',
    'LEAN_CANVAS',
    'PERSONA',
    'JOURNEY_MAP',
    'MARKETING_PLAN',
    'USER_STORIES',
    'BRAND_WHEEL',
    'BRAND_IDENTITY',
    'INTERVIEW_QUESTIONS',
    'TEAM_ROLES',
    'ICP',
    'OKR',
    'PITCH_OUTLINE',
    'COMPETITOR_MAP',
    'TAM_SAM_SOM',
    'VALUE_PROP',
    'JTBD',
    'EXPERIMENT_PLAN',
    'BRAND_GUIDELINES',
    'LAUNCH_ROADMAP',
    'FINANCIAL_PROJECTIONS',
    'RISK_ASSESSMENT',
    'GTM_STRATEGY',
    'PRODUCT_ROADMAP',
    'TEAM_STRUCTURE',
    'FUNDING_STRATEGY',
    'OPERATIONS_PLAN',
    'TECHNOLOGY_STACK'
);


--
-- Name: asset_language; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_language AS ENUM (
    'en',
    'ar'
);


--
-- Name: audit_log_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_log_type AS ENUM (
    'STATUS_CHANGED',
    'SCORED',
    'REVIEW_INVITE',
    'COMMENT_ADDED',
    'COMMENT_EDITED',
    'COMMENT_DELETED',
    'REVIEWER_ASSIGNED',
    'REVIEWER_REMOVED'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED'
);


--
-- Name: challenge_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.challenge_status AS ENUM (
    'draft',
    'active',
    'upcoming',
    'ended'
);


--
-- Name: idea_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.idea_status AS ENUM (
    'BACKLOG',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'IN_INCUBATION',
    'ARCHIVED'
);


--
-- Name: message_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_role AS ENUM (
    'user',
    'assistant',
    'system',
    'tool'
);


--
-- Name: pitch_deck_lifecycle; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pitch_deck_lifecycle AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'REVIEWED',
    'SUBMITTED',
    'REJECTED'
);


--
-- Name: pitch_deck_review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pitch_deck_review_status AS ENUM (
    'APPROVED',
    'REJECTED',
    'NEEDS_REVISION'
);


--
-- Name: pitch_deck_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pitch_deck_status AS ENUM (
    'GENERATING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


--
-- Name: platform_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.platform_event_type AS ENUM (
    'ROLE_UPDATED',
    'MEMBER_ADDED',
    'MEMBER_REMOVED',
    'PROGRAM_PROGRESS_UPDATED',
    'IDEA_STATUS_CHANGED',
    'CHALLENGE_STATUS_CHANGED',
    'APPLICATION_STATUS_CHANGED'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'BACKLOG',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'IN_INCUBATION',
    'ARCHIVED'
);


--
-- Name: project_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_type AS ENUM (
    'RESEARCH',
    'DEVELOP',
    'LAUNCH'
);


--
-- Name: publish_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.publish_status AS ENUM (
    'NONE',
    'FINALIST',
    'WINNER'
);


--
-- Name: review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REVOKED'
);


--
-- Name: role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role AS ENUM (
    'OWNER',
    'MEMBER',
    'MENTOR',
    'ADMIN',
    'JUDGE'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'PENDING',
    'ACTIVE'
);


--
-- Name: verdict; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verdict AS ENUM (
    'APPROVE',
    'REJECT'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academy_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_courses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying,
    slug character varying(100) NOT NULL,
    title character varying(300) NOT NULL,
    description text,
    thumbnail_url character varying(1000),
    is_published boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: academy_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_videos (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    course_id character varying NOT NULL,
    slug character varying(100) NOT NULL,
    title character varying(300) NOT NULL,
    description text,
    video_url character varying(1000) NOT NULL,
    duration_seconds integer DEFAULT 0,
    display_order integer DEFAULT 0,
    is_published boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ai_outputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_outputs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    idea_id character varying NOT NULL,
    kind character varying(100) NOT NULL,
    content jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: asset_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_versions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    asset_id character varying NOT NULL,
    data jsonb NOT NULL,
    label character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    kind public.asset_kind NOT NULL,
    title character varying NOT NULL,
    data jsonb NOT NULL,
    markdown text,
    language public.asset_language DEFAULT 'en'::public.asset_language,
    html text,
    diagram jsonb,
    created_by_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    user_id character varying NOT NULL,
    booking_id character varying,
    session_type character varying(50) DEFAULT 'MENTOR_SESSION'::character varying,
    scheduled_date character varying(10) NOT NULL,
    scheduled_time character varying(5),
    checked_in_at timestamp without time zone,
    checked_out_at timestamp without time zone,
    status character varying(20) DEFAULT 'SCHEDULED'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    idea_id character varying NOT NULL,
    actor_id character varying,
    type public.audit_log_type NOT NULL,
    data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: challenge_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_submissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    challenge_id character varying NOT NULL,
    user_id character varying NOT NULL,
    idea_id character varying,
    title character varying(255) NOT NULL,
    description text,
    submission_url character varying,
    attachments jsonb DEFAULT '[]'::jsonb,
    status character varying(50) DEFAULT 'submitted'::character varying,
    score integer,
    feedback text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    pitch_deck_url character varying,
    prototype_url character varying
);


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenges (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    short_description character varying(500),
    slug character varying(100) NOT NULL,
    deadline timestamp without time zone NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    submission_count integer DEFAULT 0,
    max_submissions integer DEFAULT 100,
    image character varying,
    emoji character varying(10) DEFAULT '🎯'::character varying,
    status public.challenge_status DEFAULT 'draft'::public.challenge_status,
    prize character varying,
    evaluation_criteria text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chats (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    title character varying,
    created_by_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    author_id character varying NOT NULL,
    body_md text NOT NULL,
    mentions jsonb DEFAULT '[]'::jsonb,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: course_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_progress (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    course_slug character varying(100) NOT NULL,
    video_slug character varying(100) NOT NULL,
    watched_seconds integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    last_watched_at timestamp without time zone DEFAULT now()
);


--
-- Name: event_speakers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_speakers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    event_id character varying NOT NULL,
    name character varying(200) NOT NULL,
    role character varying(200),
    company character varying(200),
    bio text,
    image_url character varying(1000),
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    short_description text,
    description text,
    location character varying(500),
    website_url character varying(1000),
    image_url character varying(1000),
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id character varying
);


--
-- Name: idea_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idea_evaluations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    org_id character varying NOT NULL,
    evaluated_by character varying NOT NULL,
    b1 integer,
    b2 integer,
    b3 integer,
    b4 integer,
    b5 integer,
    t1 integer,
    t2 integer,
    t3 integer,
    t4 integer,
    s1 integer,
    s2 integer,
    s3 integer,
    total_score integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: idea_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idea_scores (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    idea_id character varying NOT NULL,
    metrics_id character varying NOT NULL,
    breakdown jsonb NOT NULL,
    total integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ideas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideas (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    summary text NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    status public.idea_status DEFAULT 'BACKLOG'::public.idea_status NOT NULL,
    owner_id character varying NOT NULL,
    org_id character varying NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: judge_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.judge_evaluations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    org_id character varying NOT NULL,
    judge_id character varying NOT NULL,
    d1 integer,
    d2 integer,
    d3 integer,
    d4 integer,
    d5 integer,
    p1 integer,
    p2 integer,
    p3 integer,
    p4 integer,
    e1 integer,
    e2 integer,
    e3 integer,
    total_score integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: member_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_applications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    org_id character varying NOT NULL,
    challenge_id character varying,
    idea_name character varying(255),
    sector character varying(100),
    problem_statement text,
    solution_description text,
    differentiator text,
    target_user text,
    relevant_skills text,
    previous_winner character varying(10),
    has_validation character varying(10),
    validation_details text,
    status character varying(30) DEFAULT 'PENDING_REVIEW'::character varying NOT NULL,
    ai_score integer,
    ai_metrics jsonb,
    ai_strengths jsonb,
    ai_recommendations jsonb,
    ai_insights text,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: mentor_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    mentor_user_id character varying NOT NULL,
    member_user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: mentor_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_availability (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    mentor_profile_id character varying NOT NULL,
    day_of_week integer NOT NULL,
    start_time character varying(5) NOT NULL,
    end_time character varying(5) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: mentor_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_bookings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    mentor_profile_id character varying NOT NULL,
    user_id character varying NOT NULL,
    idea_id character varying,
    booked_date character varying(10) NOT NULL,
    booked_time character varying(5) NOT NULL,
    duration_minutes integer DEFAULT 60,
    status public.booking_status DEFAULT 'PENDING'::public.booking_status,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    pitch_deck_id character varying,
    rating integer,
    feedback text,
    calendly_event_uri character varying(500),
    calendly_invitee_uri character varying(500),
    meeting_provider character varying(40) DEFAULT 'INTERNAL'::character varying,
    meeting_link character varying(1000),
    mentor_feedback text,
    mentor_feedback_updated_at timestamp without time zone
);


--
-- Name: mentor_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    org_id character varying NOT NULL,
    title character varying(200),
    bio text,
    location character varying(200),
    website character varying(500),
    expertise jsonb DEFAULT '[]'::jsonb,
    industries jsonb DEFAULT '[]'::jsonb,
    session_duration_minutes integer DEFAULT 60,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    calendly_link character varying(500),
    calendly_event_type_uri character varying(500),
    calendly_access_token text,
    calendly_refresh_token text,
    calendly_token_expiry timestamp without time zone,
    calendly_user_uri character varying(500)
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    chat_id character varying NOT NULL,
    role public.message_role NOT NULL,
    text text,
    audio_url character varying,
    language character varying DEFAULT 'en'::character varying,
    tool_run_id character varying,
    meta jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: metrics_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metrics_sets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    name character varying(255) NOT NULL,
    payload jsonb NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: module_consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_consultations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    module_id character varying NOT NULL,
    title text NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    mentor_profile_id character varying,
    max_attendees integer,
    location text,
    meeting_link text,
    notes text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: module_mentors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_mentors (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    module_id character varying NOT NULL,
    mentor_profile_id character varying NOT NULL,
    role text DEFAULT 'support'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: module_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_resources (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    module_id character varying NOT NULL,
    title text NOT NULL,
    type text DEFAULT 'link'::text NOT NULL,
    url text NOT NULL,
    description text,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    kind character varying(50) NOT NULL,
    payload jsonb NOT NULL,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    user_id character varying NOT NULL,
    role public.role DEFAULT 'MEMBER'::public.role,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    logo_url character varying,
    dark_logo_url character varying,
    primary_color character varying DEFAULT '#4588f5'::character varying,
    slug character varying NOT NULL,
    domain character varying,
    challenges_enabled boolean DEFAULT true,
    experts_enabled boolean DEFAULT true,
    radar_enabled boolean DEFAULT true,
    dashboard_enabled boolean DEFAULT true,
    ai_builder_enabled boolean DEFAULT true,
    form_submission_enabled boolean DEFAULT true,
    manual_build_enabled boolean DEFAULT true,
    academy_enabled boolean DEFAULT true,
    evaluation_criteria_files jsonb DEFAULT '[]'::jsonb,
    evaluation_criteria_text text,
    default_route character varying DEFAULT 'navigation.dashboard'::character varying,
    dashboard_name_en character varying,
    dashboard_name_ar character varying,
    my_ideas_name_en character varying,
    my_ideas_name_ar character varying,
    my_ideas_desc_en character varying,
    my_ideas_desc_ar character varying,
    challenges_name_en character varying,
    challenges_name_ar character varying,
    challenges_desc_en character varying,
    challenges_desc_ar character varying,
    radar_name_en character varying,
    radar_name_ar character varying,
    radar_desc_en character varying,
    radar_desc_ar character varying,
    experts_title_en character varying,
    experts_title_ar character varying,
    experts_name_en character varying,
    experts_name_ar character varying,
    experts_desc_en character varying,
    experts_desc_ar character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    token character varying NOT NULL,
    user_id character varying NOT NULL,
    org_id character varying,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: pitch_deck_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pitch_deck_generations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    asset_id character varying,
    task_id character varying NOT NULL,
    status public.pitch_deck_status DEFAULT 'GENERATING'::public.pitch_deck_status,
    template character varying DEFAULT 'Modern Business'::character varying,
    theme character varying DEFAULT 'Professional'::character varying,
    color_scheme character varying DEFAULT 'Blue'::character varying,
    font_family character varying DEFAULT 'Inter'::character varying,
    download_url character varying,
    error_message text,
    created_by_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    lifecycle_status public.pitch_deck_lifecycle DEFAULT 'DRAFT'::public.pitch_deck_lifecycle,
    draft_notes text,
    last_auto_saved_at timestamp without time zone,
    submitted_at timestamp without time zone,
    submitted_by_id character varying,
    is_locked boolean DEFAULT false,
    locked_at timestamp without time zone,
    locked_reason text,
    locked_by_id character varying
);


--
-- Name: pitch_deck_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pitch_deck_reviews (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    pitch_deck_id character varying NOT NULL,
    reviewer_id character varying NOT NULL,
    review_status public.pitch_deck_review_status NOT NULL,
    feedback text,
    reviewed_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pitch_deck_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pitch_deck_versions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    pitch_deck_id character varying NOT NULL,
    label character varying(255) NOT NULL,
    snapshot_url character varying,
    notes text,
    created_by_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    actor_id character varying,
    event_type public.platform_event_type NOT NULL,
    target_user_id character varying,
    target_entity_id character varying,
    target_entity_label character varying,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: program_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_modules (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    title text NOT NULL,
    title_ar text,
    description text,
    description_ar text,
    stage_index integer DEFAULT 1 NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    location text,
    location_type text DEFAULT 'online'::text NOT NULL,
    meeting_link text,
    unlock_rules jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: project_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_evaluations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    org_id character varying NOT NULL,
    overall_score integer NOT NULL,
    metrics jsonb NOT NULL,
    strengths jsonb NOT NULL,
    recommendations jsonb NOT NULL,
    insights text,
    evaluated_by character varying,
    evaluated_at timestamp without time zone DEFAULT now() NOT NULL,
    criteria_snapshot jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    challenge_id character varying,
    title character varying NOT NULL,
    description text,
    type public.project_type DEFAULT 'RESEARCH'::public.project_type,
    status public.project_status DEFAULT 'BACKLOG'::public.project_status,
    generated_files jsonb,
    deployment_url character varying,
    submitted boolean DEFAULT false,
    created_by_id character varying NOT NULL,
    verscale_chat_id character varying,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    pitch_deck_url character varying,
    publish_status public.publish_status DEFAULT 'NONE'::public.publish_status,
    published_at timestamp without time zone,
    published_by_id character varying
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    idea_id character varying NOT NULL,
    reviewer_id character varying NOT NULL,
    status public.review_status DEFAULT 'PENDING'::public.review_status NOT NULL,
    verdict public.verdict,
    rationale text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: scoring_criteria_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_criteria_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type character varying(20) NOT NULL,
    config jsonb NOT NULL,
    updated_by character varying,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50),
    email character varying,
    password character varying(255),
    first_name character varying,
    last_name character varying,
    status public.user_status DEFAULT 'ACTIVE'::public.user_status,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    login_count integer DEFAULT 0,
    last_login_at timestamp without time zone
);


--
-- Name: workspace_program_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_program_progress (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    org_id character varying NOT NULL,
    current_step integer DEFAULT 1 NOT NULL,
    steps jsonb DEFAULT '[{"titleAr": "الريادة وأسس الأعمال", "titleEn": "Ideation & Business Foundations"}, {"titleAr": "استراتيجية المنتج والتحقق", "titleEn": "Product Strategy & Validation"}, {"titleAr": "تصميم المنتج والرؤى", "titleEn": "Product Design & Insights"}, {"titleAr": "العرض التقديمي", "titleEn": "Pitching & Presentation"}]'::jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by character varying
);


--
-- Name: academy_courses academy_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_courses
    ADD CONSTRAINT academy_courses_pkey PRIMARY KEY (id);


--
-- Name: academy_courses academy_courses_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_courses
    ADD CONSTRAINT academy_courses_slug_unique UNIQUE (slug);


--
-- Name: academy_videos academy_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_videos
    ADD CONSTRAINT academy_videos_pkey PRIMARY KEY (id);


--
-- Name: ai_outputs ai_outputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_outputs
    ADD CONSTRAINT ai_outputs_pkey PRIMARY KEY (id);


--
-- Name: asset_versions asset_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_versions
    ADD CONSTRAINT asset_versions_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: challenge_submissions challenge_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_pkey PRIMARY KEY (id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: course_progress course_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_progress
    ADD CONSTRAINT course_progress_pkey PRIMARY KEY (id);


--
-- Name: event_speakers event_speakers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_speakers
    ADD CONSTRAINT event_speakers_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: idea_evaluations idea_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_evaluations
    ADD CONSTRAINT idea_evaluations_pkey PRIMARY KEY (id);


--
-- Name: idea_scores idea_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_scores
    ADD CONSTRAINT idea_scores_pkey PRIMARY KEY (id);


--
-- Name: ideas ideas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_pkey PRIMARY KEY (id);


--
-- Name: judge_evaluations judge_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.judge_evaluations
    ADD CONSTRAINT judge_evaluations_pkey PRIMARY KEY (id);


--
-- Name: member_applications member_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_applications
    ADD CONSTRAINT member_applications_pkey PRIMARY KEY (id);


--
-- Name: mentor_assignments mentor_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_assignments
    ADD CONSTRAINT mentor_assignments_pkey PRIMARY KEY (id);


--
-- Name: mentor_availability mentor_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_availability
    ADD CONSTRAINT mentor_availability_pkey PRIMARY KEY (id);


--
-- Name: mentor_bookings mentor_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_pkey PRIMARY KEY (id);


--
-- Name: mentor_profiles mentor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: metrics_sets metrics_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metrics_sets
    ADD CONSTRAINT metrics_sets_pkey PRIMARY KEY (id);


--
-- Name: module_consultations module_consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_consultations
    ADD CONSTRAINT module_consultations_pkey PRIMARY KEY (id);


--
-- Name: module_mentors module_mentors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_mentors
    ADD CONSTRAINT module_mentors_pkey PRIMARY KEY (id);


--
-- Name: module_resources module_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_resources
    ADD CONSTRAINT module_resources_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token);


--
-- Name: pitch_deck_generations pitch_deck_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_generations
    ADD CONSTRAINT pitch_deck_generations_pkey PRIMARY KEY (id);


--
-- Name: pitch_deck_reviews pitch_deck_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_reviews
    ADD CONSTRAINT pitch_deck_reviews_pkey PRIMARY KEY (id);


--
-- Name: pitch_deck_versions pitch_deck_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_versions
    ADD CONSTRAINT pitch_deck_versions_pkey PRIMARY KEY (id);


--
-- Name: platform_events platform_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_pkey PRIMARY KEY (id);


--
-- Name: program_modules program_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_modules
    ADD CONSTRAINT program_modules_pkey PRIMARY KEY (id);


--
-- Name: project_evaluations project_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_evaluations
    ADD CONSTRAINT project_evaluations_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: scoring_criteria_config scoring_criteria_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_criteria_config
    ADD CONSTRAINT scoring_criteria_config_pkey PRIMARY KEY (id);


--
-- Name: scoring_criteria_config scoring_criteria_config_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_criteria_config
    ADD CONSTRAINT scoring_criteria_config_type_unique UNIQUE (type);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workspace_program_progress workspace_program_progress_org_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_program_progress
    ADD CONSTRAINT workspace_program_progress_org_id_unique UNIQUE (org_id);


--
-- Name: workspace_program_progress workspace_program_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_program_progress
    ADD CONSTRAINT workspace_program_progress_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_challenge_submissions_challenge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_submissions_challenge_id ON public.challenge_submissions USING btree (challenge_id);


--
-- Name: idx_challenge_submissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_submissions_user_id ON public.challenge_submissions USING btree (user_id);


--
-- Name: idx_challenges_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenges_org_id ON public.challenges USING btree (org_id);


--
-- Name: idx_challenges_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenges_slug ON public.challenges USING btree (slug);


--
-- Name: idx_challenges_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenges_sort_order ON public.challenges USING btree (sort_order);


--
-- Name: idx_challenges_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenges_status ON public.challenges USING btree (status);


--
-- Name: idx_course_progress_user_video; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_course_progress_user_video ON public.course_progress USING btree (user_id, course_slug, video_slug);


--
-- Name: idx_idea_eval_project; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_idea_eval_project ON public.idea_evaluations USING btree (project_id);


--
-- Name: idx_judge_eval_judge_project; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_judge_eval_judge_project ON public.judge_evaluations USING btree (judge_id, project_id);


--
-- Name: mentor_assignments_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mentor_assignments_unique ON public.mentor_assignments USING btree (org_id, mentor_user_id, member_user_id);


--
-- Name: module_mentors_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX module_mentors_unique ON public.module_mentors USING btree (module_id, mentor_profile_id);


--
-- Name: academy_courses academy_courses_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_courses
    ADD CONSTRAINT academy_courses_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: academy_videos academy_videos_course_id_academy_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_videos
    ADD CONSTRAINT academy_videos_course_id_academy_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.academy_courses(id) ON DELETE CASCADE;


--
-- Name: ai_outputs ai_outputs_idea_id_ideas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_outputs
    ADD CONSTRAINT ai_outputs_idea_id_ideas_id_fk FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;


--
-- Name: asset_versions asset_versions_asset_id_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_versions
    ADD CONSTRAINT asset_versions_asset_id_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: assets assets_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: assets assets_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: attendance_records attendance_records_booking_id_mentor_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_booking_id_mentor_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.mentor_bookings(id) ON DELETE SET NULL;


--
-- Name: attendance_records attendance_records_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_idea_id_ideas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_idea_id_ideas_id_fk FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions challenge_submissions_challenge_id_challenges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_challenge_id_challenges_id_fk FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions challenge_submissions_idea_id_ideas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_idea_id_ideas_id_fk FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE SET NULL;


--
-- Name: challenge_submissions challenge_submissions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: challenges challenges_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: challenges challenges_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chats chats_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: chats chats_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: comments comments_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: comments comments_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: course_progress course_progress_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_progress
    ADD CONSTRAINT course_progress_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_speakers event_speakers_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_speakers
    ADD CONSTRAINT event_speakers_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: idea_evaluations idea_evaluations_evaluated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_evaluations
    ADD CONSTRAINT idea_evaluations_evaluated_by_users_id_fk FOREIGN KEY (evaluated_by) REFERENCES public.users(id);


--
-- Name: idea_evaluations idea_evaluations_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_evaluations
    ADD CONSTRAINT idea_evaluations_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: idea_evaluations idea_evaluations_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_evaluations
    ADD CONSTRAINT idea_evaluations_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: idea_scores idea_scores_idea_id_ideas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_scores
    ADD CONSTRAINT idea_scores_idea_id_ideas_id_fk FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;


--
-- Name: idea_scores idea_scores_metrics_id_metrics_sets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_scores
    ADD CONSTRAINT idea_scores_metrics_id_metrics_sets_id_fk FOREIGN KEY (metrics_id) REFERENCES public.metrics_sets(id);


--
-- Name: ideas ideas_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: ideas ideas_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: judge_evaluations judge_evaluations_judge_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.judge_evaluations
    ADD CONSTRAINT judge_evaluations_judge_id_users_id_fk FOREIGN KEY (judge_id) REFERENCES public.users(id);


--
-- Name: judge_evaluations judge_evaluations_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.judge_evaluations
    ADD CONSTRAINT judge_evaluations_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: judge_evaluations judge_evaluations_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.judge_evaluations
    ADD CONSTRAINT judge_evaluations_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: member_applications member_applications_challenge_id_challenges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_applications
    ADD CONSTRAINT member_applications_challenge_id_challenges_id_fk FOREIGN KEY (challenge_id) REFERENCES public.challenges(id);


--
-- Name: member_applications member_applications_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_applications
    ADD CONSTRAINT member_applications_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: member_applications member_applications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_applications
    ADD CONSTRAINT member_applications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: mentor_assignments mentor_assignments_member_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_assignments
    ADD CONSTRAINT mentor_assignments_member_user_id_users_id_fk FOREIGN KEY (member_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mentor_assignments mentor_assignments_mentor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_assignments
    ADD CONSTRAINT mentor_assignments_mentor_user_id_users_id_fk FOREIGN KEY (mentor_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mentor_assignments mentor_assignments_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_assignments
    ADD CONSTRAINT mentor_assignments_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: mentor_availability mentor_availability_mentor_profile_id_mentor_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_availability
    ADD CONSTRAINT mentor_availability_mentor_profile_id_mentor_profiles_id_fk FOREIGN KEY (mentor_profile_id) REFERENCES public.mentor_profiles(id) ON DELETE CASCADE;


--
-- Name: mentor_bookings mentor_bookings_idea_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_idea_id_projects_id_fk FOREIGN KEY (idea_id) REFERENCES public.projects(id);


--
-- Name: mentor_bookings mentor_bookings_mentor_profile_id_mentor_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_mentor_profile_id_mentor_profiles_id_fk FOREIGN KEY (mentor_profile_id) REFERENCES public.mentor_profiles(id);


--
-- Name: mentor_bookings mentor_bookings_pitch_deck_id_pitch_deck_generations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_pitch_deck_id_pitch_deck_generations_id_fk FOREIGN KEY (pitch_deck_id) REFERENCES public.pitch_deck_generations(id);


--
-- Name: mentor_bookings mentor_bookings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: mentor_profiles mentor_profiles_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: mentor_profiles mentor_profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages messages_chat_id_chats_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_chats_id_fk FOREIGN KEY (chat_id) REFERENCES public.chats(id);


--
-- Name: metrics_sets metrics_sets_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metrics_sets
    ADD CONSTRAINT metrics_sets_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: metrics_sets metrics_sets_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metrics_sets
    ADD CONSTRAINT metrics_sets_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: module_consultations module_consultations_mentor_profile_id_mentor_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_consultations
    ADD CONSTRAINT module_consultations_mentor_profile_id_mentor_profiles_id_fk FOREIGN KEY (mentor_profile_id) REFERENCES public.mentor_profiles(id) ON DELETE SET NULL;


--
-- Name: module_consultations module_consultations_module_id_program_modules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_consultations
    ADD CONSTRAINT module_consultations_module_id_program_modules_id_fk FOREIGN KEY (module_id) REFERENCES public.program_modules(id) ON DELETE CASCADE;


--
-- Name: module_mentors module_mentors_mentor_profile_id_mentor_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_mentors
    ADD CONSTRAINT module_mentors_mentor_profile_id_mentor_profiles_id_fk FOREIGN KEY (mentor_profile_id) REFERENCES public.mentor_profiles(id) ON DELETE CASCADE;


--
-- Name: module_mentors module_mentors_module_id_program_modules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_mentors
    ADD CONSTRAINT module_mentors_module_id_program_modules_id_fk FOREIGN KEY (module_id) REFERENCES public.program_modules(id) ON DELETE CASCADE;


--
-- Name: module_resources module_resources_module_id_program_modules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_resources
    ADD CONSTRAINT module_resources_module_id_program_modules_id_fk FOREIGN KEY (module_id) REFERENCES public.program_modules(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organization_members organization_members_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: organization_members organization_members_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: pitch_deck_generations pitch_deck_generations_asset_id_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_generations
    ADD CONSTRAINT pitch_deck_generations_asset_id_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: pitch_deck_generations pitch_deck_generations_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_generations
    ADD CONSTRAINT pitch_deck_generations_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: pitch_deck_generations pitch_deck_generations_locked_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_generations
    ADD CONSTRAINT pitch_deck_generations_locked_by_id_users_id_fk FOREIGN KEY (locked_by_id) REFERENCES public.users(id);


--
-- Name: pitch_deck_generations pitch_deck_generations_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_generations
    ADD CONSTRAINT pitch_deck_generations_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: pitch_deck_generations pitch_deck_generations_submitted_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_generations
    ADD CONSTRAINT pitch_deck_generations_submitted_by_id_users_id_fk FOREIGN KEY (submitted_by_id) REFERENCES public.users(id);


--
-- Name: pitch_deck_reviews pitch_deck_reviews_pitch_deck_id_pitch_deck_generations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_reviews
    ADD CONSTRAINT pitch_deck_reviews_pitch_deck_id_pitch_deck_generations_id_fk FOREIGN KEY (pitch_deck_id) REFERENCES public.pitch_deck_generations(id) ON DELETE CASCADE;


--
-- Name: pitch_deck_reviews pitch_deck_reviews_reviewer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_reviews
    ADD CONSTRAINT pitch_deck_reviews_reviewer_id_users_id_fk FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: pitch_deck_versions pitch_deck_versions_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_versions
    ADD CONSTRAINT pitch_deck_versions_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: pitch_deck_versions pitch_deck_versions_pitch_deck_id_pitch_deck_generations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitch_deck_versions
    ADD CONSTRAINT pitch_deck_versions_pitch_deck_id_pitch_deck_generations_id_fk FOREIGN KEY (pitch_deck_id) REFERENCES public.pitch_deck_generations(id) ON DELETE CASCADE;


--
-- Name: platform_events platform_events_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: platform_events platform_events_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: platform_events platform_events_target_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_target_user_id_users_id_fk FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: program_modules program_modules_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_modules
    ADD CONSTRAINT program_modules_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: project_evaluations project_evaluations_evaluated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_evaluations
    ADD CONSTRAINT project_evaluations_evaluated_by_users_id_fk FOREIGN KEY (evaluated_by) REFERENCES public.users(id);


--
-- Name: project_evaluations project_evaluations_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_evaluations
    ADD CONSTRAINT project_evaluations_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: project_evaluations project_evaluations_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_evaluations
    ADD CONSTRAINT project_evaluations_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_challenge_id_challenges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_challenge_id_challenges_id_fk FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE SET NULL;


--
-- Name: projects projects_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: projects projects_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: projects projects_published_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_published_by_id_users_id_fk FOREIGN KEY (published_by_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_idea_id_ideas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_idea_id_ideas_id_fk FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_users_id_fk FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: scoring_criteria_config scoring_criteria_config_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_criteria_config
    ADD CONSTRAINT scoring_criteria_config_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: workspace_program_progress workspace_program_progress_org_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_program_progress
    ADD CONSTRAINT workspace_program_progress_org_id_organizations_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: workspace_program_progress workspace_program_progress_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_program_progress
    ADD CONSTRAINT workspace_program_progress_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--


