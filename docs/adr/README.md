# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the LifeBox IoT Platform. ADRs document important architectural decisions made during the development of the system.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs help teams:

- **Document the reasoning** behind architectural choices
- **Maintain historical context** for future developers
- **Track the evolution** of system architecture
- **Enable informed decision-making** based on past experiences

## ADR Format

Each ADR follows a consistent structure:

1. **Title**: A short descriptive title
2. **Status**: Proposed, Accepted, Deprecated, or Superseded
3. **Context**: The situation that led to this decision
4. **Decision**: The architectural decision made
5. **Consequences**: The positive and negative outcomes

## ADR Index

| ADR # | Title | Status | Date |
|-------|-------|--------|------|
| [ADR-001](001-monorepo-architecture.md) | Monorepo Architecture with NPM Workspaces | ✅ Accepted | 2025-01-15 |
| [ADR-002](002-nestjs-api-framework.md) | NestJS as API Framework | ✅ Accepted | 2025-01-15 |
| [ADR-003](003-nextjs-frontend-framework.md) | Next.js as Frontend Framework | ✅ Accepted | 2025-01-15 |
| [ADR-004](004-prisma-orm-choice.md) | Prisma as ORM and Database Layer | ✅ Accepted | 2025-01-15 |
| [ADR-005](005-postgresql-timescaledb.md) | PostgreSQL with TimescaleDB Extension | ✅ Accepted | 2025-01-15 |
| [ADR-006](006-emqx-mqtt-broker.md) | EMQX as MQTT Broker | ✅ Accepted | 2025-01-15 |
| [ADR-007](007-docker-containerization.md) | Docker for Containerization | ✅ Accepted | 2025-01-15 |
| [ADR-008](008-turbo-build-system.md) | Turbo for Monorepo Build System | ✅ Accepted | 2025-01-15 |
| [ADR-009](009-enhanced-rbac-system.md) | Enhanced RBAC with Device-Specific Permissions | ✅ Accepted | 2025-01-16 |
| [ADR-010](010-fawry-payment-integration.md) | Fawry Payment Gateway Integration | ✅ Accepted | 2025-01-16 |

## Creating New ADRs

To create a new ADR:

1. **Determine the next ADR number** by checking the latest ADR in this directory
2. **Use the template**: Copy `template.md` and rename it with the appropriate number and title
3. **Fill in all sections** with relevant information
4. **Update this README** to include the new ADR in the index
5. **Submit for review** through the normal PR process

## ADR Statuses

- **🟡 Proposed**: Under discussion and review
- **✅ Accepted**: Decision has been made and is being implemented
- **⚠️ Deprecated**: No longer recommended but still in use
- **❌ Superseded**: Replaced by a newer ADR

## Guidelines

- **Keep ADRs immutable**: Don't modify ADRs after they're accepted. Create new ones instead.
- **Be concise but complete**: Include enough detail for future developers to understand the decision.
- **Focus on the "why"**: The reasoning is more important than the "what".
- **Include alternatives**: Document what options were considered and why they were rejected.
- **Update status when needed**: Mark ADRs as deprecated or superseded when appropriate.

## References

- [ADR Template](template.md)
- [Architecture Decision Records by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)