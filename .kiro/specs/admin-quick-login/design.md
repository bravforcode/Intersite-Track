# Design Document: Admin Quick Login

## Overview

The Admin Quick Login feature adds a development-focused UI component to the TaskAm login page that enables instant authentication with pre-configured test accounts. This feature accelerates development and testing workflows by eliminating the need to manually enter credentials when switching between different user roles (Admin and Staff).

The implementation leverages the existing Supabase Auth infrastructure and follows the established authentication flow pattern. The Quick Login UI will be conditionally rendered based on environme