-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "role_id" TEXT NOT NULL,
    "client_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_device_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_device_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_permissions" (
    "id" TEXT NOT NULL,
    "command_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "is_system_level" BOOLEAN NOT NULL DEFAULT false,
    "is_client_level" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "command_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_command_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "command_permission_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "can_delegate" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "scope_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_command_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_name" TEXT,
    "subscription_type" TEXT,
    "client_tier" TEXT,
    "payment_status" TEXT,
    "payment_method" TEXT,
    "electricity_rate_egp" DECIMAL(10,2) NOT NULL DEFAULT 2.15,
    "replacing_source" TEXT,
    "credit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "fawry_payment_id" TEXT,
    "billing_type" TEXT NOT NULL DEFAULT 'prepaid',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "phone_number_1" TEXT,
    "phone_number_2" TEXT,
    "phone_number_3" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "monthly_fee" DECIMAL(10,2),
    "status" TEXT NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_pricing" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "pricing_type" TEXT NOT NULL,
    "rate_value" DECIMAL(10,2) NOT NULL,
    "per_unit" DECIMAL(10,2) NOT NULL,
    "unit_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "customer_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postpaid_periods" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "postpaid_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_tracking" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "session_start" TIMESTAMP(3) NOT NULL,
    "session_end" TIMESTAMP(3),
    "energy_consumed_kwh" DOUBLE PRECISION DEFAULT 0,
    "water_pumped_m3" DOUBLE PRECISION DEFAULT 0,
    "cost_egp" DECIMAL(10,2) DEFAULT 0,
    "payment_type" TEXT NOT NULL,
    "postpaid_period_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance_before" DECIMAL(10,2) NOT NULL,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "reference_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fawry_bill_inquiries" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "async_request_id" TEXT NOT NULL,
    "billing_account" TEXT NOT NULL,
    "bill_type_code" TEXT NOT NULL,
    "terminal_id" TEXT,
    "delivery_method" TEXT,
    "request_timestamp" TIMESTAMP(3) NOT NULL,
    "request_payload" JSONB NOT NULL,
    "response_status_code" INTEGER NOT NULL,
    "response_status_description" TEXT,
    "response_payload" JSONB NOT NULL,
    "response_timestamp" TIMESTAMP(3) NOT NULL,
    "bill_amount" DECIMAL(10,2),
    "client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fawry_bill_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fawry_payment_notifications" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "async_request_id" TEXT NOT NULL,
    "fptn" TEXT NOT NULL,
    "bnkptn" TEXT,
    "bnkdtn" TEXT,
    "fcrn" TEXT,
    "billing_account" TEXT NOT NULL,
    "bill_type_code" TEXT NOT NULL,
    "terminal_id" TEXT,
    "client_terminal_seq_id" TEXT,
    "payment_method" TEXT NOT NULL,
    "payment_type" TEXT NOT NULL,
    "delivery_method" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "is_retry" BOOLEAN NOT NULL DEFAULT false,
    "payment_status" TEXT NOT NULL,
    "request_timestamp" TIMESTAMP(3) NOT NULL,
    "request_payload" JSONB NOT NULL,
    "response_status_code" INTEGER NOT NULL,
    "response_status_description" TEXT,
    "response_payload" JSONB NOT NULL,
    "response_timestamp" TIMESTAMP(3) NOT NULL,
    "client_id" TEXT,
    "credit_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fawry_payment_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fawry_customer_data" (
    "id" TEXT NOT NULL,
    "payment_notification_id" TEXT NOT NULL,
    "official_id" TEXT,
    "official_id_type" TEXT,
    "name" TEXT,
    "middle_name" TEXT,
    "last_name" TEXT,
    "birth_date" DATE,
    "gender" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fawry_customer_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_code" TEXT NOT NULL,
    "seitech_device_id" TEXT,
    "lifebox_code" TEXT NOT NULL,
    "device_type" TEXT NOT NULL DEFAULT 'solar_pump',
    "installation_date" TIMESTAMP(3),
    "commissioning_date" TIMESTAMP(3),
    "warranty_end_date" TIMESTAMP(3),
    "contract_reference" TEXT,
    "components" JSONB NOT NULL DEFAULT '{}',
    "pump_details" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_locations" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "address" TEXT,
    "governorate" TEXT,
    "city" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_metadata_history" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_metadata_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_metadata_snapshots" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "configuration_hash" TEXT NOT NULL,
    "metadata_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),

    CONSTRAINT "device_metadata_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_alarms" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "severity" INTEGER NOT NULL,
    "propagate" BOOLEAN NOT NULL DEFAULT true,
    "raw_data" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "device_alarms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMPTZ(6) NOT NULL,
    "device_id" TEXT NOT NULL,
    "extras" JSONB,
    "raw_payload" JSONB,
    "ingestion_source" TEXT NOT NULL DEFAULT 'mqtt',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accumulated_nonsolar_consumption_value" DOUBLE PRECISION,
    "accumulated_solar_consumption_value" DOUBLE PRECISION,
    "bus_voltage_value" DOUBLE PRECISION,
    "client_tier_value" TEXT,
    "commissioning_date_value" TEXT,
    "configuration_hash" TEXT,
    "contract_ref_number_value" TEXT,
    "daily_nonsolar_consumption_value" DOUBLE PRECISION,
    "daily_solar_consumption_value" DOUBLE PRECISION,
    "device_code_value" TEXT,
    "device_id_value" TEXT,
    "device_metadata_snapshot" JSONB,
    "energy_per_day_value" DOUBLE PRECISION,
    "frequency_value" DOUBLE PRECISION,
    "hourly_nonsolar_consumption_value" DOUBLE PRECISION,
    "hourly_solar_consumption_value" DOUBLE PRECISION,
    "hw_version_value" TEXT,
    "installation_date_value" TEXT,
    "inverter_direction_value" TEXT,
    "inverter_status_value" TEXT,
    "inverter_supply_source_value" TEXT,
    "inverter_temperature_value" DOUBLE PRECISION,
    "last_inv_update_value" TEXT,
    "level_sensor_value" DOUBLE PRECISION,
    "lifebox_code_value" TEXT,
    "location_value" TEXT,
    "metadata_version" INTEGER,
    "money_saved_value" DOUBLE PRECISION,
    "motor_speed_value" DOUBLE PRECISION,
    "power_source_of_box_value" TEXT,
    "pressure_sensor_value" DOUBLE PRECISION,
    "pump_current_value" DOUBLE PRECISION,
    "pump_energy_consumption_value" DOUBLE PRECISION,
    "pump_power_value" DOUBLE PRECISION,
    "pump_status_value" TEXT,
    "pump_voltage_value" DOUBLE PRECISION,
    "replacing_what_value" TEXT,
    "start_command_mode_value" TEXT,
    "subscription_type_value" TEXT,
    "sw_version_value" TEXT,
    "system_components_value" TEXT,
    "tds_value" DOUBLE PRECISION,
    "total_co2_mitigated_value" DOUBLE PRECISION,
    "total_energy_value" DOUBLE PRECISION,
    "total_water_volume_m3_value" DOUBLE PRECISION,
    "water_pumped_flow_rate_per_hour_value" DOUBLE PRECISION,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unknown_field_catalog" (
    "id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "sample_values" JSONB,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "promoted_at" TIMESTAMP(3),
    "promoted_by" TEXT,
    "affected_devices" TEXT[],
    "configuration_hashes" TEXT[],
    "device_contexts" JSONB,

    CONSTRAINT "unknown_field_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_commands" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "command_type" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "control_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_acknowledgments" (
    "id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "ack_type" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "command_template" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "variables" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "required_role" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "command_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarm_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "device_id" TEXT,
    "alarm_category" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold_value" DOUBLE PRECISION,
    "threshold_duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "pre_alarm_threshold" DOUBLE PRECISION,
    "severity" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "custom_dashboard_message" TEXT,
    "custom_email_message" TEXT,
    "custom_sms_message" TEXT,

    CONSTRAINT "alarm_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarm_reactions" (
    "id" TEXT NOT NULL,
    "alarm_rule_id" TEXT NOT NULL,
    "reaction_type" TEXT NOT NULL,
    "reaction_config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alarm_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarm_events" (
    "id" TEXT NOT NULL,
    "alarm_rule_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "triggered_value" DOUBLE PRECISION,
    "message" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "notifications_sent" JSONB,

    CONSTRAINT "alarm_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "fawry_reference_number" TEXT,
    "fawry_transaction_id" TEXT,
    "amount_egp" DECIMAL(10,2) NOT NULL,
    "amount_usd" DECIMAL(10,2),
    "exchange_rate" DECIMAL(10,4),
    "payment_method" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "billing_period_start" TIMESTAMP(3),
    "billing_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sustainability_metrics" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_energy_mwh" DOUBLE PRECISION,
    "co2_mitigated_tons" DOUBLE PRECISION,
    "money_saved_egp" DECIMAL(12,2),
    "money_saved_usd" DECIMAL(12,2),
    "calculation_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculation_details" JSONB,
    "exchange_rate_date" TIMESTAMP(3),
    "exchange_rate_used" DECIMAL(10,6),

    CONSTRAINT "sustainability_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL DEFAULT 'EGP',
    "target_currency" TEXT NOT NULL DEFAULT 'USD',
    "rate" DECIMAL(10,6) NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_formulas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "constants" JSONB NOT NULL,
    "result_unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculation_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_results" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "formula_id" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "result" DECIMAL(15,6) NOT NULL,
    "inputValues" JSONB NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widgets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widget_type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "layout_config" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "config_overrides" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_role" TEXT NOT NULL,
    "layout_config" JSONB NOT NULL,
    "is_system_default" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_template_widgets" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "config_overrides" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_template_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_dashboard_assignments" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_dashboard_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "report_type" TEXT,
    "parameters" JSONB,
    "template_config" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "schedule_type" TEXT NOT NULL,
    "schedule_config" JSONB,
    "recipients" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action_type" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "filesize" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "uploaded_by" TEXT NOT NULL,
    "client_id" TEXT,
    "device_id" TEXT,
    "path" TEXT NOT NULL,
    "url" TEXT,
    "checksum" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_view_pages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "quick_view_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_view_devices" (
    "id" TEXT NOT NULL,
    "quick_view_page_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quick_view_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_view_commands" (
    "id" TEXT NOT NULL,
    "quick_view_page_id" TEXT NOT NULL,
    "command_template_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "custom_label" TEXT,

    CONSTRAINT "quick_view_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_view_page_shares" (
    "id" TEXT NOT NULL,
    "quick_view_page_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "can_use_commands" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shared_by" TEXT NOT NULL,

    CONSTRAINT "quick_view_page_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_client_id_idx" ON "users"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "user_device_assignments_user_id_idx" ON "user_device_assignments"("user_id");

-- CreateIndex
CREATE INDEX "user_device_assignments_device_id_idx" ON "user_device_assignments"("device_id");

-- CreateIndex
CREATE INDEX "user_device_assignments_assigned_by_idx" ON "user_device_assignments"("assigned_by");

-- CreateIndex
CREATE UNIQUE INDEX "user_device_assignments_user_id_device_id_key" ON "user_device_assignments"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "command_permissions_command_type_key" ON "command_permissions"("command_type");

-- CreateIndex
CREATE INDEX "command_permissions_command_type_idx" ON "command_permissions"("command_type");

-- CreateIndex
CREATE INDEX "command_permissions_category_idx" ON "command_permissions"("category");

-- CreateIndex
CREATE INDEX "user_command_permissions_user_id_idx" ON "user_command_permissions"("user_id");

-- CreateIndex
CREATE INDEX "user_command_permissions_command_permission_id_idx" ON "user_command_permissions"("command_permission_id");

-- CreateIndex
CREATE INDEX "user_command_permissions_granted_by_idx" ON "user_command_permissions"("granted_by");

-- CreateIndex
CREATE INDEX "user_command_permissions_scope_scope_id_idx" ON "user_command_permissions"("scope", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_command_permissions_user_id_command_permission_id_scop_key" ON "user_command_permissions"("user_id", "command_permission_id", "scope", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_resource_action_key" ON "role_permissions"("role_id", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "clients_fawry_payment_id_key" ON "clients"("fawry_payment_id");

-- CreateIndex
CREATE INDEX "customer_pricing_client_id_idx" ON "customer_pricing"("client_id");

-- CreateIndex
CREATE INDEX "postpaid_periods_client_id_idx" ON "postpaid_periods"("client_id");

-- CreateIndex
CREATE INDEX "usage_tracking_device_id_idx" ON "usage_tracking"("device_id");

-- CreateIndex
CREATE INDEX "usage_tracking_client_id_idx" ON "usage_tracking"("client_id");

-- CreateIndex
CREATE INDEX "credit_transactions_client_id_idx" ON "credit_transactions"("client_id");

-- CreateIndex
CREATE INDEX "fawry_bill_inquiries_request_id_idx" ON "fawry_bill_inquiries"("request_id");

-- CreateIndex
CREATE INDEX "fawry_bill_inquiries_billing_account_idx" ON "fawry_bill_inquiries"("billing_account");

-- CreateIndex
CREATE INDEX "fawry_bill_inquiries_client_id_idx" ON "fawry_bill_inquiries"("client_id");

-- CreateIndex
CREATE INDEX "fawry_bill_inquiries_created_at_idx" ON "fawry_bill_inquiries"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "fawry_payment_notifications_fptn_key" ON "fawry_payment_notifications"("fptn");

-- CreateIndex
CREATE INDEX "fawry_payment_notifications_request_id_idx" ON "fawry_payment_notifications"("request_id");

-- CreateIndex
CREATE INDEX "fawry_payment_notifications_fptn_idx" ON "fawry_payment_notifications"("fptn");

-- CreateIndex
CREATE INDEX "fawry_payment_notifications_billing_account_idx" ON "fawry_payment_notifications"("billing_account");

-- CreateIndex
CREATE INDEX "fawry_payment_notifications_client_id_idx" ON "fawry_payment_notifications"("client_id");

-- CreateIndex
CREATE INDEX "fawry_payment_notifications_created_at_idx" ON "fawry_payment_notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "fawry_customer_data_payment_notification_id_idx" ON "fawry_customer_data"("payment_notification_id");

-- CreateIndex
CREATE INDEX "notifications_client_id_idx" ON "notifications"("client_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_code_key" ON "devices"("device_code");

-- CreateIndex
CREATE UNIQUE INDEX "devices_seitech_device_id_key" ON "devices"("seitech_device_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_lifebox_code_key" ON "devices"("lifebox_code");

-- CreateIndex
CREATE INDEX "devices_client_id_idx" ON "devices"("client_id");

-- CreateIndex
CREATE INDEX "devices_is_active_idx" ON "devices"("is_active");

-- CreateIndex
CREATE INDEX "device_metadata_snapshots_device_id_idx" ON "device_metadata_snapshots"("device_id");

-- CreateIndex
CREATE INDEX "device_metadata_snapshots_device_id_valid_from_idx" ON "device_metadata_snapshots"("device_id", "valid_from");

-- CreateIndex
CREATE INDEX "device_metadata_snapshots_configuration_hash_idx" ON "device_metadata_snapshots"("configuration_hash");

-- CreateIndex
CREATE UNIQUE INDEX "device_metadata_snapshots_device_id_version_key" ON "device_metadata_snapshots"("device_id", "version");

-- CreateIndex
CREATE INDEX "device_alarms_device_id_received_at_idx" ON "device_alarms"("device_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "device_alarms_device_id_resolved_idx" ON "device_alarms"("device_id", "resolved");

-- CreateIndex
CREATE INDEX "device_alarms_type_severity_idx" ON "device_alarms"("type", "severity");

-- CreateIndex
CREATE INDEX "device_alarms_received_at_idx" ON "device_alarms"("received_at" DESC);

-- CreateIndex
CREATE INDEX "telemetry_events_device_id_time_idx" ON "telemetry_events"("device_id", "time" DESC);

-- CreateIndex
CREATE INDEX "telemetry_events_device_id_pump_status_value_idx" ON "telemetry_events"("device_id", "pump_status_value");

-- CreateIndex
CREATE INDEX "telemetry_events_device_id_inverter_supply_source_value_idx" ON "telemetry_events"("device_id", "inverter_supply_source_value");

-- CreateIndex
CREATE INDEX "telemetry_events_device_id_power_source_of_box_value_idx" ON "telemetry_events"("device_id", "power_source_of_box_value");

-- CreateIndex
CREATE INDEX "telemetry_events_time_idx" ON "telemetry_events"("time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "unknown_field_catalog_field_name_key" ON "unknown_field_catalog"("field_name");

-- CreateIndex
CREATE INDEX "control_commands_device_id_status_idx" ON "control_commands"("device_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "command_templates_name_key" ON "command_templates"("name");

-- CreateIndex
CREATE INDEX "command_templates_category_is_active_idx" ON "command_templates"("category", "is_active");

-- CreateIndex
CREATE INDEX "command_templates_is_default_is_active_idx" ON "command_templates"("is_default", "is_active");

-- CreateIndex
CREATE INDEX "alarm_events_device_id_triggered_at_idx" ON "alarm_events"("device_id", "triggered_at" DESC);

-- CreateIndex
CREATE INDEX "alarm_events_device_id_resolved_at_idx" ON "alarm_events"("device_id", "resolved_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_fawry_reference_number_key" ON "payments"("fawry_reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_fawry_transaction_id_key" ON "payments"("fawry_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "sustainability_metrics_device_id_date_key" ON "sustainability_metrics"("device_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_base_currency_target_currency_effective_from_key" ON "exchange_rates"("base_currency", "target_currency", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_formulas_name_key" ON "calculation_formulas"("name");

-- CreateIndex
CREATE INDEX "calculation_results_timestamp_device_id_idx" ON "calculation_results"("timestamp", "device_id");

-- CreateIndex
CREATE INDEX "calculation_results_formula_id_timestamp_idx" ON "calculation_results"("formula_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_results_device_id_formula_id_timestamp_key" ON "calculation_results"("device_id", "formula_id", "timestamp");

-- CreateIndex
CREATE INDEX "dashboard_templates_target_role_idx" ON "dashboard_templates"("target_role");

-- CreateIndex
CREATE INDEX "dashboard_templates_is_system_default_idx" ON "dashboard_templates"("is_system_default");

-- CreateIndex
CREATE INDEX "client_dashboard_assignments_client_id_idx" ON "client_dashboard_assignments"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_dashboard_assignments_template_id_client_id_key" ON "client_dashboard_assignments"("template_id", "client_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_name_key" ON "message_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "files_filename_key" ON "files"("filename");

-- CreateIndex
CREATE INDEX "files_category_client_id_idx" ON "files"("category", "client_id");

-- CreateIndex
CREATE INDEX "files_uploaded_by_idx" ON "files"("uploaded_by");

-- CreateIndex
CREATE INDEX "files_device_id_idx" ON "files"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_view_pages_slug_key" ON "quick_view_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "quick_view_devices_quick_view_page_id_device_id_key" ON "quick_view_devices"("quick_view_page_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_view_commands_quick_view_page_id_command_template_id_key" ON "quick_view_commands"("quick_view_page_id", "command_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_view_page_shares_quick_view_page_id_user_id_key" ON "quick_view_page_shares"("quick_view_page_id", "user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_assignments" ADD CONSTRAINT "user_device_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_assignments" ADD CONSTRAINT "user_device_assignments_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_assignments" ADD CONSTRAINT "user_device_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_command_permissions" ADD CONSTRAINT "user_command_permissions_command_permission_id_fkey" FOREIGN KEY ("command_permission_id") REFERENCES "command_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_command_permissions" ADD CONSTRAINT "user_command_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_command_permissions" ADD CONSTRAINT "user_command_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_pricing" ADD CONSTRAINT "customer_pricing_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_pricing" ADD CONSTRAINT "customer_pricing_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postpaid_periods" ADD CONSTRAINT "postpaid_periods_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postpaid_periods" ADD CONSTRAINT "postpaid_periods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_postpaid_period_id_fkey" FOREIGN KEY ("postpaid_period_id") REFERENCES "postpaid_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fawry_bill_inquiries" ADD CONSTRAINT "fawry_bill_inquiries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fawry_payment_notifications" ADD CONSTRAINT "fawry_payment_notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fawry_payment_notifications" ADD CONSTRAINT "fawry_payment_notifications_credit_transaction_id_fkey" FOREIGN KEY ("credit_transaction_id") REFERENCES "credit_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fawry_customer_data" ADD CONSTRAINT "fawry_customer_data_payment_notification_id_fkey" FOREIGN KEY ("payment_notification_id") REFERENCES "fawry_payment_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_locations" ADD CONSTRAINT "device_locations_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_metadata_history" ADD CONSTRAINT "device_metadata_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_metadata_history" ADD CONSTRAINT "device_metadata_history_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_metadata_snapshots" ADD CONSTRAINT "device_metadata_snapshots_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_alarms" ADD CONSTRAINT "device_alarms_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_alarms" ADD CONSTRAINT "device_alarms_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unknown_field_catalog" ADD CONSTRAINT "unknown_field_catalog_promoted_by_fkey" FOREIGN KEY ("promoted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_commands" ADD CONSTRAINT "control_commands_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_commands" ADD CONSTRAINT "control_commands_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_acknowledgments" ADD CONSTRAINT "command_acknowledgments_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "control_commands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_templates" ADD CONSTRAINT "command_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_rules" ADD CONSTRAINT "alarm_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_rules" ADD CONSTRAINT "alarm_rules_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_reactions" ADD CONSTRAINT "alarm_reactions_alarm_rule_id_fkey" FOREIGN KEY ("alarm_rule_id") REFERENCES "alarm_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_events" ADD CONSTRAINT "alarm_events_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_events" ADD CONSTRAINT "alarm_events_alarm_rule_id_fkey" FOREIGN KEY ("alarm_rule_id") REFERENCES "alarm_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_events" ADD CONSTRAINT "alarm_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sustainability_metrics" ADD CONSTRAINT "sustainability_metrics_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_formulas" ADD CONSTRAINT "calculation_formulas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_results" ADD CONSTRAINT "calculation_results_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_results" ADD CONSTRAINT "calculation_results_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "calculation_formulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "widgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_templates" ADD CONSTRAINT "dashboard_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_template_widgets" ADD CONSTRAINT "dashboard_template_widgets_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "dashboard_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_template_widgets" ADD CONSTRAINT "dashboard_template_widgets_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "widgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_dashboard_assignments" ADD CONSTRAINT "client_dashboard_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_dashboard_assignments" ADD CONSTRAINT "client_dashboard_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_dashboard_assignments" ADD CONSTRAINT "client_dashboard_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "dashboard_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "report_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_view_pages" ADD CONSTRAINT "quick_view_pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_view_devices" ADD CONSTRAINT "quick_view_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_view_devices" ADD CONSTRAINT "quick_view_devices_quick_view_page_id_fkey" FOREIGN KEY ("quick_view_page_id") REFERENCES "quick_view_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_view_commands" ADD CONSTRAINT "quick_view_commands_command_template_id_fkey" FOREIGN KEY ("command_template_id") REFERENCES "command_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_view_commands" ADD CONSTRAINT "quick_view_commands_quick_view_page_id_fkey" FOREIGN KEY ("quick_view_page_id") REFERENCES "quick_view_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_view_page_shares" ADD CONSTRAINT "quick_view_page_shares_quick_view_page_id_fkey" FOREIGN KEY ("quick_view_page_id") REFERENCES "quick_view_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_view_page_shares" ADD CONSTRAINT "quick_view_page_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_view_page_shares" ADD CONSTRAINT "quick_view_page_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

