-- ============================================================================
-- Migration: Add 'admin' role to user_role ENUM
-- ============================================================================
-- This migration extends the user_role PostgreSQL enum type to include 'admin'.
-- The admin role acts as the restaurant owner, responsible for creating and
-- deleting credentials for managers and waiters.
-- ============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
