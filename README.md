\# CivicPulse - Smart Citizen Reporting System



Advanced MERN Assessment Project (MySQL Implementation)



\## Design Decision: MySQL over MongoDB



\*\*Original Requirement:\*\* MongoDB + Mongoose

\*\*Our Implementation:\*\* MySQL 8 + Sequelize ORM + Spatial Extensions



\*\*Why MySQL?\*\*

1\. \*\*Relational Integrity:\*\* CivicPulse requires strict RBAC (Admin/Manager/Officer/Citizen)

&#x20;  with foreign keys (issues -> departments -> areas). MySQL enforces FK, MongoDB doesn't.

2\. \*\*Geospatial Same:\*\* MySQL 8 supports ST\_Contains, ST\_Distance, POLYGON same as MongoDB

&#x20;  $geoWithin / $near. Our `areas` table uses POLYGON spatial data.

3\. \*\*ACID Transactions:\*\* Issue lifecycle (create + audit + notifications) needs transactions.

4\. \*\*Govt Ready:\*\* MySQL widely used in civic/govt systems.



\*\*Equivalence:\*\*

\- Mongoose Schema → Sequelize Models with same indexes

\- 2dsphere index → MySQL SPATIAL INDEX on location

\- Aggregation → SQL GROUP BY aggregations

\- $geoWithin → ST\_Contains(polygon, point)



\## Quick Start



```bash

\\# 1. Backend

cd backend-dev

npm install

npm run reset-db

npm run seed

npm run dev



\\# 2. Frontend (new terminal)

cd frontend-dev

npm install

npm run dev


