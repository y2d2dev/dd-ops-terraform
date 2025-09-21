psql:
	psql -h localhost -p 5432 -U postgres -d dd_ops

migrate:
	npx prisma migrate dev

psql-web:
	npx prisma studio --port 5556
