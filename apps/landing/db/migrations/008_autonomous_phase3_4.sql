-- Fase 2B, 3, & 4: LLM Supervisor Critic, Copy Analysis, Creative Briefs, dan Parameter Lanjutan Engine
alter table winning_engine_config add column if not exists advanced_params jsonb not null default '{}'::jsonb;
alter table engine_supervisor_reports add column if not exists llm_critique jsonb;
alter table engine_creative_reports add column if not exists copy_analysis jsonb;
alter table engine_creative_reports add column if not exists creative_briefs jsonb;

