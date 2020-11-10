const BookmarksService = {
  getAllBookmarks(knex) {
    return knex
      .select('*')
      .from('bookmarks')
  },
  getById(knex, id) {
    return knex
      .from('bookmarks')
      .select('*')
      .where({ id })
      .first()
  },
  insertBookmark(knex, newBookmark) {
    return knex
      .insert(newBookmark)
      .into('bookmarks')
      .returning('*')
      .then(rows => {
        return rows[0]
      })
  },
  deleteBookmark(knex, id) {
    return knex
      .from('bookmarks')
      .where({ id })
      .delete()
  },
  updateBookmark(knex, newBookmarkFields) {
    return knex
      .from('bookmarks')
      .where({ id })
      .update(newBookmarkFields)
  }
}

module.exports = BookmarksService;