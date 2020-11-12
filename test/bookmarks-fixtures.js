function makeBookmarksArray() {
  return [
    {
      id: 1,
      title: 'First test site',
      url: 'https://www.testsiteone.com',
      description: 'Test site ONE',
      rating: 1
    },
    {
      id: 2,
      title: 'Second test site',
      url: 'https://www.testsitetwo.com',
      description: 'Test site TWO',
      rating: 2
    },
    {
      id: 3,
      title: 'Third test site',
      url: 'https://www.testsitethree.com',
      description: 'Test site THREE',
      rating: 3
    }
  ];
}

function makeMaliciousBookmark() {
  const maliciousBookmark = {
    id: 666,
    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
    url: 'https://www.hackers.com',
    description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
    rating: 1
  }
  const expectedBookmark = {
    ...maliciousBookmark,
    title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return {
    maliciousBookmark,
    expectedBookmark
  }
}

module.exports = { makeBookmarksArray, makeMaliciousBookmark }