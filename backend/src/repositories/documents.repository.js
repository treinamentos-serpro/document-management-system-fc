const documents = new Map();

function add(document) {
  documents.set(document.id, { ...document });
}

function findAll() {
  return Array.from(documents.values(), (document) => ({ ...document }));
}

function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

module.exports = {
  add,
  findAll,
  findById
};