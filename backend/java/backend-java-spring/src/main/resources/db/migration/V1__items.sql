CREATE TABLE items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(512) NOT NULL
);

INSERT INTO items (name, description) VALUES
    ('Alpha', 'First seeded item from PostgreSQL'),
    ('Beta', 'Second seeded item for demo API'),
    ('Gamma', 'Third item — multistack bootstrap');
