-- Categories a class may see in the library. No rows = the class sees every category.
CREATE TABLE class_categories (
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  PRIMARY KEY (class_id, category)
);
