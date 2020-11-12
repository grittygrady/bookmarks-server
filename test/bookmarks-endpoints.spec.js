const app = require('../src/app')
const knex = require('knex')
const fixtures = require('./bookmarks-fixtures')
const supertest = require('supertest')
const { expect } = require('chai')

describe(`Bookmarks endpoints`, () => {
  let db

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

  describe(`Unauthorized requests`, () => {
    const testBookmarks = fixtures.makeBookmarksArray()

    beforeEach(`insert test bookmarks`, () => {
      return db
        .into('bookmarks')
        .insert(testBookmarks)
    })
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
      const secondBookmark = testBookmarks[1]
      return supertest(app)
        .get(`/bookmarks/${secondBookmark}`)
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`Responds with a 401 Unauthorized for DELETE /bookmarks/:bookmark_id`, () => {
      const bookmarkToDelete = testBookmarks[1]
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
    context(`Given an XSS attack attempt`, () => {
      const { maliciousBookmark, expectedBookmark } = fixtures.makeMaliciousBookmark()

      beforeEach(`Insert malicious bookmarks`, () => {
        return db
          .into('bookmarks')
          .insert(maliciousBookmark)
      })

      it(`removes XSS attack content`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title)
            expect(res.body[0].description).to.eql(expectedBookmark.description)
          })
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

    context(`Given an XSS attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = fixtures.makeMaliciousBookmark()

      beforeEach(`Insert malicious bookmark`, () => {
        return db
          .into('bookmarks')
          .insert(maliciousBookmark)
      })
      it(`Sanitizes XSS attack content`, () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedBookmark.title)
            expect(res.body.description).to.eql(expectedBookmark.description)
          })
      })
    })
  })

  describe(`DELETE /bookmarks/:id endpoint`, () => {
    context(`given no bookmarks`, () => {
      it(`Responds with 404 if bookmark does not exist`, () => {
        return supertest(app)
          .delete(`/bookmarks/12345`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark not found`}
          })
      })
    })
    
    context(`Given there are bookmarks`, () => {
      const testBookmarks = fixtures.makeBookmarksArray()

      beforeEach(`Insert bookmarks`, () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it(`removes the bookmark by ID from the database`, () => {
        const bookmarkToDelete = 2
        const expectedBookmarks = testBookmarks.filter(bm => bm.id !== bookmarkToDelete)
        return supertest(app)
          .delete(`/bookmarks/${bookmarkToDelete}`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .then(() =>
            supertest(app)
              .get(`/bookmarks`)
              .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          )
      })
    })
  })

  describe.only(`POST /bookmarks`, () => {
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

    it(`Creates a new article, responding 201 and the new article`, () => {
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
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
        })
        .then(postRes => 
          supertest(app)
            .get(`/bookmarks/${postRes.body.id}`)
            .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
            .expect(postRes.body)
        )
    })
    it(`sanitizes XSS content from response`, () => {
      const { maliciousBookmark, expectedBookmark } = fixtures.makeMaliciousBookmark()

      return supertest(app)
        .post(`/bookmarks`)
        .send(maliciousBookmark)
        .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.description).to.eql(expectedBookmark.description)
        })
    })
  })
})


