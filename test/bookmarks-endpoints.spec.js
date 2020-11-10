const app = require('../src/app')
const store = require('../src/store')
const knex = require('knex')
const fixtures = require('./bookmarks-fixtures')
const supertest = require('supertest')
const { expect } = require('chai')

describe(`Bookmarks endpoints`, () => {
  let db, bookmarksCopy

  before(`Make knex instance`, () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    })
    app.set('db', db)
  })

  after(`Disconnect from the database`, () => db.destroy())

  before(`Clean the tables`, () => db('bookmarks').truncate())

  afterEach(`Clean the tables`, () => db('bookmarks').truncate())

  beforeEach(`copy the bookmarks`, () => {
    bookmarksCopy = store.bookmarks.slice()
  })

  afterEach(`Restore the bookmarks store`, () => {
    store.bookmarks = bookmarksCopy
  })

  describe(`Unauthorized requests`, () => {
    it(`Responds with 401 Unauthorized for GET /bookmarks`, () => {
      return supertest(app)
        .get('/bookmarks')
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`Responds with a 401 Unauthorized for POST /bookmarks`, () => {
      return supertest(app)
        .post('/bookmarks')
        .send({
          title: 'Test title',
          url: 'https://www.thisgoesnowhere.com',
          rating: 3,
          description: 'This is optional!'
        })
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`Responds with 401 Unauthorized for GET /bookmarks/:bookmark_id`, () => {
      const secondBookmark = store.bookmarks[1]
      return supertest(app)
        .get(`/bookmarks/${secondBookmark}`)
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`Responds with a 401 Unauthorized for DELETE /bookmarks/:bookmark_id`, () => {
      const bookmarkToDelete = store.bookmarks[1]
      return supertest(app)
        .delete(`/bookmarks/${bookmarkToDelete.id}`)
        .expect(401, { error: 'Unauthorized request' })
    })
  })

  describe(`GET /bookmarks with authorization`, () => {
    context(`Given no bookmarks`, () => {
      it(`Responds with 200 and an empty array`, () => {
        return supertest(app)
          .get(`/bookmarks`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })
    
    context(`Given there are bookmarks in the database`, () => {
      const testBookmarks = fixtures.makeBookmarksArray()

      beforeEach(`insert bookmarks`, () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it(`Responds with 200 and all of the test bookmarks`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  })

  describe(`GET /bookmarks/:id`, () => {
    context(`Given no bookmarks in database`, () => {
      it(`Responds with 404 not found when bookmark doesn't exist`, () => {
        return supertest(app)
          .get(`/bookmarks/12345`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark not found` } })
      })
    })

    context(`Given there are bookmarks in the database`, () => {
      const testBookmarks = fixtures.makeBookmarksArray()

      beforeEach(`Insert bookmarks into table`, () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it(`Responds with 200 and the selected article`, () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId - 1]

        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })
  })

  describe(`DELETE /bookmarks/:id endpoint`, () => {
    it(`Removes the bookmark by id from the store`, () => {
      const secondBookmark = store.bookmarks[1]
      const expectedBookmarks = store.bookmarks.filter(bm => bm.id !== secondBookmark.id)

      return supertest(app)
        .delete(`/bookmarks/${secondBookmark.id}`)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(204)
        .then(() => {
          expect(store.bookmarks).to.eql(expectedBookmarks)
        })
    })

    it(`Responds with 404 if bookmark does not exist`, () => {
      return supertest(app)
        .delete(`/bookmarks/12345`)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(404, 'Bookmark not found')
    })
  })

  describe(`POST /bookmarks`, () => {
    it(`Responds with 400 missing title if not supplied`, () => {
      const newBookmarkNoTitle = {
        url: 'https://www.test.com',
        rating: 3
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkNoTitle)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'title' is required`)
    })

    it(`Responds with 400 missing url if not supplied`, () => {
      const newBookmarkNoUrl = {
        title: 'Test title',
        rating: 3
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkNoUrl)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'url' is required`)
    })

    it(`Responds with a 400 missing rating if not supplied`, () => {
      const newBookmarkNoRating = {
        title: 'Test with no rating',
        url: 'https://www.norating.com'
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkNoRating)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'rating' is required`)
    })

    it(`Responds with a 400 'Rating' must be a number between 0 and 5`, () => {
      const newBookmarkInvalidRating = {
        title: 'Invalid Rating',
        url: 'https://www.invalidrating.com',
        rating: 6
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkInvalidRating)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'Rating' must be a number between 0 and 5`)
    })

    it(`Responds with a 400 invalid url`, () => {
      const newBookmarkInvalidUrl = {
        title: 'Invalid url',
        url: 'hps://thisisinvalid',
        rating: 3
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkInvalidUrl)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'url' must be a valid url`)
    })

    it(`Adds a new bookmark to the store`, () => {
      const bookmarkToAdd = {
        title: 'Add This!',
        url: 'http://www.thiswebsiteisinsecure.com',
        rating: 4,
        description: 'This should be added!'
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(bookmarkToAdd)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(bookmarkToAdd.title)
          expect(res.body.url).to.eql(bookmarkToAdd.url)
          expect(res.body.rating).to.eql(bookmarkToAdd.rating)
          expect(res.body.description).to.eql(bookmarkToAdd.description)
        })
        .then(res => {
          expect(store.bookmarks[store.bookmarks.length - 1]).to.eql(res.body)
        })
    })
  })
})


