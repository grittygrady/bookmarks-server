const { expect } = require('chai')
const knex = require('knex')
const supertest = require('supertest')
const app = require('../src/app')
const store = require('../src/store')
const fixtures = require('./bookmarks-fixtures')

describe('Bookmarks endpoint', function() {
  let db, bookmarksCopy

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    })
    app.set('db', db)
  })

  after('disconnect from the db', () => db.destroy())

  before('clean the table', () => db('bookmarks').truncate())

  afterEach('clean the table', () => db('bookmarks').truncate())

  context('Given there are bookmarks in the database', () => {
    const testBookmarks = fixtures.makeBookmarksArray()

    beforeEach('insert articles', () => {
      return db
        .into('bookmarks')
        .insert(testBookmarks)
    })

    it(`GET articles responds with 200 and all of the articles`, () => {
      return supertest(app)
        .get('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(200, testBookmarks)
    })

    it(`GET /articles/:article_id responds with 200 and the selected article`, () => {
      const bookmarkId = 2
      const expectedBookmark = testBookmarks[bookmarkId - 1]
      return supertest(app)
        .get(`/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(200, expectedBookmark)
    })
  })
})

