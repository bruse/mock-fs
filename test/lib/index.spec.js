var path = require('path');

var mock = require('../../lib/index');
var assert = require('../helper').assert;

describe('The API', function() {

  describe('fs()', function() {

    it('configures a fs module with a mock file system', function(done) {

      var fs = mock.fs({
        'path/to/file.txt': 'file content'
      });

      fs.exists('path/to/file.txt', function(exists) {
        assert.isTrue(exists);
        done();
      });

    });

    it('accepts an arbitrary nesting of files and directories', function() {

      var fs = mock.fs({
        'dir-one': {
          'dir-two': {
            'some-file.txt': 'file content here'
          }
        },
        'empty-dir': {}
      });

      assert.isTrue(fs.existsSync('dir-one/dir-two/some-file.txt'));
      assert.isTrue(fs.statSync('dir-one/dir-two/some-file.txt').isFile());
      assert.isTrue(fs.statSync('dir-one/dir-two').isDirectory());
      assert.isTrue(fs.statSync('empty-dir').isDirectory());

    });

    describe('_reconfigure()', function() {

      it('provides a method to reconfigure the mock file system', function() {

        var fs = mock.fs({
          'first-file.txt': 'file content'
        });
        assert.isTrue(fs.existsSync('first-file.txt'));

        fs._reconfigure({
          'second-file.txt': 'new content'
        });

        assert.isFalse(fs.existsSync('first-file.txt'));
        assert.isTrue(fs.existsSync('second-file.txt'));

      });

    });

  });

  describe('file()', function() {

    it('lets you create files with additional properties', function(done) {

      var fs = mock.fs({
        'path/to/file.txt': mock.file({
          content: 'file content',
          mtime: new Date(8675309),
          mode: 0644
        })
      });

      fs.stat('path/to/file.txt', function(err, stats) {
        if (err) {
          return done(err);
        }
        assert.isTrue(stats.isFile());
        assert.isFalse(stats.isDirectory());
        assert.equal(stats.mtime.getTime(), 8675309);
        assert.equal(stats.mode & 0777, 0644);
        done();
      });

    });

  });

  describe('directory()', function() {

    it('lets you create directories with more properties', function(done) {

      var fs = mock.fs({
        'path/to/dir': mock.directory({
          mtime: new Date(8675309),
          mode: 0644
        })
      });

      fs.stat('path/to/dir', function(err, stats) {
        if (err) {
          return done(err);
        }
        assert.isFalse(stats.isFile());
        assert.isTrue(stats.isDirectory());
        assert.equal(stats.mtime.getTime(), 8675309);
        assert.equal(stats.mode & 0777, 0644);
        done();
      });

    });

  });

  describe('symlink()', function() {

    it('lets you create symbolic links', function() {

      var fs = mock.fs({
        'path/to/file': 'content',
        'path/to/link': mock.symlink({path: './file'})
      });

      var stats = fs.statSync('path/to/link');
      assert.isTrue(stats.isFile());
      assert.equal(String(fs.readFileSync('path/to/link')), 'content');

    });

  });

});

describe('fs.rename(oldPath, newPath, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/a.bin': new Buffer([1, 2, 3]),
      'empty': {},
      'nested': {
        'dir': {
          'file.txt': ''
        }
      }
    });
  });

  it('allows files to be renamed', function(done) {
    fs.rename('path/to/a.bin', 'path/to/b.bin', function(err) {
      assert.isTrue(!err);
      assert.isFalse(fs.existsSync('path/to/a.bin'));
      assert.isTrue(fs.existsSync('path/to/b.bin'));
      done();
    });
  });

  it('calls callback with an error if old path does not exist', function(done) {
    fs.rename('bogus', 'empty', function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

  it('overwrites existing files', function(done) {
    fs.rename('path/to/a.bin', 'nested/dir/file.txt', function(err) {
      assert.isTrue(!err);
      assert.isFalse(fs.existsSync('path/to/a.bin'));
      assert.isTrue(fs.existsSync('nested/dir/file.txt'));
      done();
    });
  });

  it('allows directories to be renamed', function(done) {
    fs.rename('path/to', 'path/foo', function(err) {
      assert.isTrue(!err);
      assert.isFalse(fs.existsSync('path/to'));
      assert.isTrue(fs.existsSync('path/foo'));
      assert.deepEqual(fs.readdirSync('path/foo'), ['a.bin']);
      done();
    });
  });

  it('calls callback with error if new directory is not empty', function(done) {
    fs.rename('path', 'nested', function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.renameSync(oldPath, newPath)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/a.bin': new Buffer([1, 2, 3]),
      'empty': {},
      'nested': {
        'dir': {
          'file.txt': ''
        }
      },
      'link': mock.symlink({path: './path/to/a.bin'})
    });
  });

  it('allows files to be renamed', function() {
    fs.renameSync('path/to/a.bin', 'path/to/b.bin');
    assert.isFalse(fs.existsSync('path/to/a.bin'));
    assert.isTrue(fs.existsSync('path/to/b.bin'));
  });

  it('overwrites existing files', function() {
    fs.renameSync('path/to/a.bin', 'nested/dir/file.txt');
    assert.isFalse(fs.existsSync('path/to/a.bin'));
    assert.isTrue(fs.existsSync('nested/dir/file.txt'));
  });

  it('allows directories to be renamed', function() {
    fs.renameSync('path/to', 'path/foo');
    assert.isFalse(fs.existsSync('path/to'));
    assert.isTrue(fs.existsSync('path/foo'));
    assert.deepEqual(fs.readdirSync('path/foo'), ['a.bin']);
  });

  it('replaces existing directories (if empty)', function() {
    fs.renameSync('path/to', 'empty');
    assert.isFalse(fs.existsSync('path/to'));
    assert.isTrue(fs.existsSync('empty'));
    assert.deepEqual(fs.readdirSync('empty'), ['a.bin']);
  });

  it('renames symbolic links', function() {
    fs.renameSync('link', 'renamed');
    assert.isTrue(fs.existsSync('renamed'));
    assert.isFalse(fs.existsSync('link'));
    assert.isTrue(fs.existsSync('path/to/a.bin'));
  });

  it('throws if old path does not exist', function() {
    assert.throws(function() {
      fs.renameSync('bogus', 'empty');
    });
  });

  it('throws if new path basename is not directory', function() {
    assert.throws(function() {
      fs.renameSync('path/to/a.bin', 'bogus/a.bin');
    });
  });

  it('throws if new dir is not empty dir', function() {
    assert.throws(function() {
      fs.renameSync('path/to', 'nested');
    });
  });

});

describe('fs.fstat(fd, callback)', function() {
  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content',
      'empty': {}
    });
  });

  it('accepts a file descriptor for a file (r)', function(done) {

    var fd = fs.openSync('path/to/file.txt', 'r');
    fs.fstat(fd, function(err, stats) {
      if (err) {
        return done(err);
      }
      assert.isTrue(stats.isFile());
      assert.equal(stats.size, 12);
      done();
    });

  });

  it('accepts a file descriptor for a directory (r)', function(done) {

    var fd = fs.openSync('path/to', 'r');
    fs.fstat(fd, function(err, stats) {
      if (err) {
        return done(err);
      }
      assert.isTrue(stats.isDirectory());
      assert.isTrue(stats.size > 0);
      done();
    });

  });

  it('fails for bad file descriptor', function(done) {

    var fd = fs.openSync('path/to/file.txt', 'r');
    fs.closeSync(fd);
    fs.fstat(fd, function(err, stats) {
      assert.instanceOf(err, Error);
      done();
    });

  });

});

describe('fs.fstatSync(fd)', function() {
  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content',
      'empty': {}
    });
  });

  it('accepts a file descriptor for a file (r)', function() {

    var fd = fs.openSync('path/to/file.txt', 'r');
    var stats = fs.fstatSync(fd);
    assert.isTrue(stats.isFile());
    assert.equal(stats.size, 12);

  });

  it('accepts a file descriptor for a directory (r)', function() {

    var fd = fs.openSync('path/to', 'r');
    var stats = fs.fstatSync(fd);
    assert.isTrue(stats.isDirectory());
    assert.isTrue(stats.size > 0);

  });

  it('fails for bad file descriptor', function() {

    var fd = fs.openSync('path/to/file.txt', 'r');
    fs.closeSync(fd);
    assert.throws(function() {
      fs.fstatSync(fd);
    });

  });

});

describe('fs.exists(path, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/a.bin': new Buffer([1, 2, 3]),
      'empty': {},
      'nested': {
        'dir': {
          'file.txt': ''
        }
      }
    });
  });

  it('calls with true if file exists', function(done) {
    fs.exists(path.join('path', 'to', 'a.bin'), function(exists) {
      assert.isTrue(exists);
      done();
    });
  });

  it('calls with true if directory exists', function(done) {
    fs.exists('path', function(exists) {
      assert.isTrue(exists);
      done();
    });
  });

  it('calls with true if empty directory exists', function(done) {
    fs.exists('empty', function(exists) {
      assert.isTrue(exists);
      done();
    });
  });

  it('calls with true if nested directory exists', function(done) {
    fs.exists(path.join('nested', 'dir'), function(exists) {
      assert.isTrue(exists);
      done();
    });
  });

  it('calls with true if file exists', function(done) {
    fs.exists(path.join('path', 'to', 'a.bin'), function(exists) {
      assert.isTrue(exists);
      done();
    });
  });

  it('calls with true if empty file exists', function(done) {
    fs.exists(path.join('nested', 'dir', 'file.txt'), function(exists) {
      assert.isTrue(exists);
      done();
    });
  });

  it('calls with false for bogus path', function(done) {
    fs.exists(path.join('bogus', 'path'), function(exists) {
      assert.isFalse(exists);
      done();
    });
  });

  it('calls with false for bogus path (II)', function(done) {
    fs.exists(path.join('nested', 'dir', 'none'), function(exists) {
      assert.isFalse(exists);
      done();
    });
  });

});


describe('fs.existsSync(path)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/a.bin': new Buffer([1, 2, 3]),
      'empty': {},
      'nested': {
        'dir': {
          'file.txt': ''
        }
      }
    });
  });

  it('returns true if file exists', function() {
    assert.isTrue(fs.existsSync(path.join('path', 'to', 'a.bin')));
  });

  it('returns true if directory exists', function() {
    assert.isTrue(fs.existsSync('path'));
  });

  it('returns true if empty directory exists', function() {
    assert.isTrue(fs.existsSync('empty'));
  });

  it('returns true if nested directory exists', function() {
    assert.isTrue(fs.existsSync(path.join('nested', 'dir')));
  });

  it('returns true if file exists', function() {
    assert.isTrue(fs.existsSync(path.join('path', 'to', 'a.bin')));
  });

  it('returns true if empty file exists', function() {
    assert.isTrue(fs.existsSync(path.join('nested', 'dir', 'file.txt')));
  });

  it('returns false for bogus path', function() {
    assert.isFalse(fs.existsSync(path.join('bogus', 'path')));
  });

  it('returns false for bogus path (II)', function() {
    assert.isFalse(fs.existsSync(path.join('nested', 'dir', 'none')));
  });

});

describe('fs.readdirSync(path)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content',
      'nested': {
        'sub': {
          'dir': {
            'one.txt': 'one content',
            'two.txt': 'two content',
            'empty': {}
          }
        }
      }
    });
  });

  it('lists directory contents', function() {
    var items = fs.readdirSync(path.join('path', 'to'));
    assert.isArray(items);
    assert.deepEqual(items, ['file.txt']);
  });

  it('lists nested directory contents', function() {
    var items = fs.readdirSync(path.join('nested', 'sub', 'dir'));
    assert.isArray(items);
    assert.deepEqual(items, ['empty', 'one.txt', 'two.txt']);
  });

  it('throws for bogus path', function() {
    assert.throws(function() {
      fs.readdirSync('bogus');
    });
  });

});


describe('fs.readdir(path, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content',
      'nested': {
        'sub': {
          'dir': {
            'one.txt': 'one content',
            'two.txt': 'two content',
            'empty': {}
          }
        }
      }
    });
  });

  it('lists directory contents', function(done) {
    fs.readdir(path.join('path', 'to'), function(err, items) {
      assert.isNull(err);
      assert.isArray(items);
      assert.deepEqual(items, ['file.txt']);
      done();
    });
  });

  it('lists nested directory contents', function(done) {
    fs.readdir(path.join('nested', 'sub', 'dir'), function(err, items) {
      assert.isNull(err);
      assert.isArray(items);
      assert.deepEqual(items, ['empty', 'one.txt', 'two.txt']);
      done();
    });
  });

  it('calls with an error for bogus path', function(done) {
    fs.readdir('bogus', function(err, items) {
      assert.instanceOf(err, Error);
      assert.isUndefined(items);
      done();
    });
  });

});

describe('fs.readdirSync(path)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content',
      'nested': {
        'sub': {
          'dir': {
            'one.txt': 'one content',
            'two.txt': 'two content',
            'empty': {}
          }
        }
      }
    });
  });

  it('lists directory contents', function() {
    var items = fs.readdirSync(path.join('path', 'to'));
    assert.isArray(items);
    assert.deepEqual(items, ['file.txt']);
  });

  it('lists nested directory contents', function() {
    var items = fs.readdirSync(path.join('nested', 'sub', 'dir'));
    assert.isArray(items);
    assert.deepEqual(items, ['empty', 'one.txt', 'two.txt']);
  });

  it('throws for bogus path', function() {
    assert.throws(function() {
      fs.readdirSync('bogus');
    });
  });

});

describe('fs.open(path, flags, [mode], callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content',
      'nested': {
        'sub': {
          'dir': {
            'one.txt': 'one content',
            'two.txt': 'two content',
            'empty': {}
          }
        }
      }
    });
  });

  it('opens an existing file for reading (r)', function(done) {
    fs.open('nested/sub/dir/one.txt', 'r', function(err, fd) {
      if (err) {
        return done(err);
      }
      assert.isNumber(fd);
      done();
    });
  });

  it('fails if file does not exist (r)', function(done) {
    fs.open('bogus.txt', 'r', function(err, fd) {
      assert.instanceOf(err, Error);
      done();
    });
  });

  it('creates a new file for writing (w)', function(done) {
    fs.open('path/to/new.txt', 'w', 0666, function(err, fd) {
      if (err) {
        return done(err);
      }
      assert.isNumber(fd);
      assert.isTrue(fs.existsSync('path/to/new.txt'));
      done();
    });
  });

  it('opens an existing file for writing (w)', function(done) {
    fs.open('path/to/one.txt', 'w', 0666, function(err, fd) {
      if (err) {
        return done(err);
      }
      assert.isNumber(fd);
      done();
    });
  });

  it('fails if file exists (wx)', function(done) {
    fs.open('path/to/one.txt', 'wx', 0666, function(err, fd) {
      if (err) {
        return done(err);
      }
      assert.isNumber(fd);
      done();
    });
  });

});

describe('fs.openSync(path, flags, [mode])', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content',
      'nested': {
        'sub': {
          'dir': {
            'one.txt': 'one content',
            'two.txt': 'two content',
            'empty': {}
          }
        }
      }
    });
  });

  it('opens an existing file for reading (r)', function() {
    var fd = fs.openSync('path/to/file.txt', 'r');
    assert.isNumber(fd);
  });

  it('fails if file does not exist (r)', function() {
    assert.throws(function() {
      fs.openSync('bogus.txt', 'r');
    });
  });

  it('creates a new file for writing (w)', function() {
    var fd = fs.openSync('nested/sub/new.txt', 'w', 0666);
    assert.isNumber(fd);
    assert.isTrue(fs.existsSync('nested/sub/new.txt'));
  });

  it('opens an existing file for writing (w)', function() {
    var fd = fs.openSync('path/to/one.txt', 'w', 0666);
    assert.isNumber(fd);
  });

  it('fails if file exists (wx)', function() {
    assert.throws(function() {
      fs.openSync('path/to/file.txt', 'wx', 0666);
    });
  });

});

describe('fs.close(fd, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({'dir': {}});
  });

  it('closes a file descriptor', function(done) {
    var fd = fs.openSync('dir/file.txt', 'w');
    fs.close(fd, function(err) {
      done(err);
    });
  });

  it('fails for closed file descriptors', function(done) {
    var fd = fs.openSync('dir/file.txt', 'w');
    fs.close(fd, function(err) {
      if (err) {
        return done(err);
      }
      fs.close(fd, function(err) {
        assert.instanceOf(err, Error);
        done();
      });
    });
  });

});

describe('fs.closeSync(fd)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({'dir': {}});
  });

  it('closes a file descriptor', function() {
    var fd = fs.openSync('dir/file.txt', 'w');
    fs.closeSync(fd);
  });

  it('fails for closed file descriptors', function() {
    var fd = fs.openSync('dir/file.txt', 'w');
    fs.closeSync(fd);
    assert.throws(function() {
      fs.closeSync(fd);
    });
  });

});

describe('fs.read(fd, buffer, offset, length, position, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content'
    });
  });

  it('allows file contents to be read', function(done) {
    fs.open('path/to/file.txt', 'r', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer(12);
      fs.read(fd, buffer, 0, 12, 0, function(err, bytesRead, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(bytesRead, 12);
        assert.equal(buf, buffer);
        assert.equal(String(buffer), 'file content');
        done();
      });
    });
  });

  it('allows file contents to be read w/ offset', function(done) {
    fs.open('path/to/file.txt', 'r', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer(12);
      fs.read(fd, buffer, 5, 12, 0, function(err, bytesRead, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(bytesRead, 7);
        assert.equal(buf, buffer);
        assert.equal(String(buffer.slice(5)), 'file co');
        done();
      });
    });
  });

  it('allows file contents to be read w/ length', function(done) {
    fs.open('path/to/file.txt', 'r', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer(12);
      fs.read(fd, buffer, 0, 4, 0, function(err, bytesRead, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(bytesRead, 4);
        assert.equal(buf, buffer);
        assert.equal(String(buffer.slice(0, 4)), 'file');
        done();
      });
    });
  });

  it('allows file contents to be read w/ offset & length', function(done) {
    fs.open('path/to/file.txt', 'r', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer(12);
      fs.read(fd, buffer, 2, 4, 0, function(err, bytesRead, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(bytesRead, 4);
        assert.equal(buf, buffer);
        assert.equal(String(buffer.slice(2, 6)), 'file');
        done();
      });
    });
  });

  it('allows file contents to be read w/ position', function(done) {
    fs.open('path/to/file.txt', 'r', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer(7);
      fs.read(fd, buffer, 0, 7, 5, function(err, bytesRead, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(bytesRead, 7);
        assert.equal(buf, buffer);
        assert.equal(String(buffer), 'content');
        done();
      });
    });
  });

  it('allows read w/ offset, length, & position', function(done) {
    fs.open('path/to/file.txt', 'r', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer(12);
      fs.read(fd, buffer, 2, 7, 5, function(err, bytesRead, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(bytesRead, 7);
        assert.equal(buf, buffer);
        assert.equal(String(buffer.slice(2, 9)), 'content');
        done();
      });
    });
  });

  it('fails for closed file descriptor', function(done) {
    var fd = fs.openSync('path/to/file.txt', 'r');
    fs.closeSync(fd);
    fs.read(fd, new Buffer(12), 0, 12, 0, function(err, bytesRead, buf) {
      assert.instanceOf(err, Error);
      assert.equal(0, bytesRead);
      done();
    });
  });

  it('fails if not open for reading', function(done) {
    var fd = fs.openSync('path/to/file.txt', 'w');
    fs.read(fd, new Buffer(12), 0, 12, 0, function(err, bytesRead, buf) {
      assert.instanceOf(err, Error);
      assert.equal(0, bytesRead);
      done();
    });
  });

});

describe('fs.readSync(fd, buffer, offset, length, position)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content'
    });
  });

  it('allows a file to be read synchronously', function() {

    var fd = fs.openSync('path/to/file.txt', 'r');
    var buffer = new Buffer(12);
    var read = fs.readSync(fd, buffer, 0, 12, 0);
    assert.equal(read, 12);
    assert.equal(String(buffer), 'file content');

  });

  it('allows a file to be read in two parts', function() {

    var fd = fs.openSync('path/to/file.txt', 'r');
    var first = new Buffer(4);
    fs.readSync(fd, first, 0, 4, 0);
    assert.equal(String(first), 'file');

    var second = new Buffer(7);
    fs.readSync(fd, second, 0, 7, 5);
    assert.equal(String(second), 'content');

  });

  it('treats null position as current position', function() {

    var fd = fs.openSync('path/to/file.txt', 'r');
    var first = new Buffer(4);
    fs.readSync(fd, first, 0, 4, null);
    assert.equal(String(first), 'file');

    // consume the space
    assert.equal(fs.readSync(fd, new Buffer(1), 0, 1, null), 1);

    var second = new Buffer(7);
    fs.readSync(fd, second, 0, 7, null);
    assert.equal(String(second), 'content');

  });

});

describe('fs.readFile(filename, [options], callback)', function() {

  // this is provided by fs.open, fs.fstat, and fs.read
  // so more heavily tested elsewhere

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content'
    });
  });

  it('allows a file to be read asynchronously', function(done) {
    fs.readFile('path/to/file.txt', function(err, data) {
      if (err) {
        return done(err);
      }
      assert.isTrue(Buffer.isBuffer(data));
      assert.equal(String(data), 'file content');
      done();
    });
  });

  it('fails for directory', function(done) {
    fs.readFile('path/to', function(err, data) {
      assert.instanceOf(err, Error);
      done();
    });
  });

  it('fails for bad path', function(done) {
    fs.readFile('path/to/bogus', function(err, data) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.readFileSync(filename, [options])', function() {

  // this is provided by fs.openSync, fs.fstatSync, and fs.readSync
  // so more heavily tested elsewhere

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content'
    });
  });

  it('allows a file to be read synchronously', function() {
    var data = fs.readFileSync('path/to/file.txt');
    assert.isTrue(Buffer.isBuffer(data));
    assert.equal(String(data), 'file content');
  });

  it('fails for directory', function() {
    assert.throws(function() {
      fs.readFileSync('path/to');
    });
  });

  it('fails for bad path', function() {
    assert.throws(function() {
      fs.readFileSync('path/to/bogus');
    });
  });

});

var fsWrite = 'fs.write(fd, buffer, offset, length, position, callback)';
describe(fsWrite, function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content'
    });
  });

  it('writes a buffer to a file', function(done) {
    fs.open('path/new-file.txt', 'w', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer('new file');
      fs.write(fd, buffer, 0, buffer.length, null, function(err, written, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(written, 8);
        assert.equal(buf, buffer);
        assert.equal(String(fs.readFileSync('path/new-file.txt')), 'new file');
        done();
      });
    });

  });

  it('can write a portion of a buffer to a file', function(done) {
    fs.open('path/new-file.txt', 'w', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer('new file');
      fs.write(fd, buffer, 1, 5, null, function(err, written, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(written, 5);
        assert.equal(buf, buffer);
        assert.equal(String(fs.readFileSync('path/new-file.txt')), 'ew fi');
        done();
      });
    });

  });

  it('can append to a file', function(done) {
    fs.open('path/to/file.txt', 'a', function(err, fd) {
      if (err) {
        return done(err);
      }
      var buffer = new Buffer(' more');
      fs.write(fd, buffer, 0, 5, null, function(err, written, buf) {
        if (err) {
          return done(err);
        }
        assert.equal(written, 5);
        assert.equal(buf, buffer);
        assert.equal(String(fs.readFileSync('path/to/file.txt')),
            'file content more');
        done();
      });
    });
  });

  it('fails if file not open for writing', function(done) {
    fs.open('path/to/file.txt', 'r', function(err, fd) {
      if (err) {
        return done(err);
      }
      fs.write(fd, new Buffer('oops'), 0, 4, null, function(err) {
        assert.instanceOf(err, Error);
        done();
      });
    });
  });

});

describe('fs.writeSync(fd, buffer, offset, length, position)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file.txt': 'file content'
    });
  });

  it('writes a buffer to a file', function() {
    var buffer = new Buffer('new file');
    var fd = fs.openSync('path/new-file.txt', 'w');
    var written = fs.writeSync(fd, buffer, 0, buffer.length);
    assert.equal(written, 8);
    assert.equal(String(fs.readFileSync('path/new-file.txt')), 'new file');

  });

  it('can write a portion of a buffer to a file', function() {
    var buffer = new Buffer('new file');
    var fd = fs.openSync('path/new-file.txt', 'w');
    var written = fs.writeSync(fd, buffer, 1, 5);
    assert.equal(written, 5);
    assert.equal(String(fs.readFileSync('path/new-file.txt')), 'ew fi');

  });

  it('can append to a file', function() {
    var buffer = new Buffer(' more');
    var fd = fs.openSync('path/to/file.txt', 'a');
    var written = fs.writeSync(fd, buffer, 0, 5);
    assert.equal(written, 5);
    assert.equal(String(fs.readFileSync('path/to/file.txt')),
        'file content more');
  });

  it('fails if file not open for writing', function() {
    var fd = fs.openSync('path/to/file.txt', 'r');
    assert.throws(function() {
      fs.writeSync(fd, new Buffer('oops'), 0, 4);
    });
  });

});

describe('fs.writeFile(filename, data, [options], callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      '.': {}
    });
  });

  it('writes a string to a file', function(done) {
    fs.writeFile('foo', 'bar', function(err) {
      if (err) {
        return done(err);
      }
      assert.equal(String(fs.readFileSync('foo')), 'bar');
      done();
    });
  });

  it('writes a buffer to a file', function(done) {
    fs.writeFile('foo', new Buffer('bar'), function(err) {
      if (err) {
        return done(err);
      }
      assert.equal(String(fs.readFileSync('foo')), 'bar');
      done();
    });
  });

  it('fails if directory does not exist', function(done) {
    fs.writeFile('foo/bar', 'baz', function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.writeFileSync(filename, data, [options]', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      '.': {}
    });
  });

  it('writes a string to a file', function() {
    fs.writeFileSync('foo', 'bar');
    assert.equal(String(fs.readFileSync('foo')), 'bar');
  });

  it('writes a buffer to a file', function() {
    fs.writeFileSync('foo', new Buffer('bar'));
    assert.equal(String(fs.readFileSync('foo')), 'bar');
  });

  it('fails if directory does not exist', function() {
    assert.throws(function() {
      fs.writeFileSync('foo/bar', 'baz');
    });
  });

});

describe('fs.appendFile(filename, data, [options], callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'dir/file.txt': 'file content',
      'link.txt': mock.symlink({path: 'dir/file.txt'})
    });
  });

  it('writes a string to a new file', function(done) {
    fs.appendFile('foo', 'bar', function(err) {
      if (err) {
        return done(err);
      }
      assert.equal(String(fs.readFileSync('foo')), 'bar');
      done();
    });
  });

  it('appends a string to an existing file', function(done) {
    fs.appendFile('dir/file.txt', ' bar', function(err) {
      if (err) {
        return done(err);
      }
      assert.equal(String(fs.readFileSync('dir/file.txt')), 'file content bar');
      done();
    });
  });

  it('appends a buffer to a file', function(done) {
    fs.appendFile('dir/file.txt', new Buffer(' bar'), function(err) {
      if (err) {
        return done(err);
      }
      assert.equal(String(fs.readFileSync('dir/file.txt')), 'file content bar');
      done();
    });
  });

  it('appends via a symbolic link file', function(done) {
    fs.appendFile('link.txt', ' bar', function(err) {
      if (err) {
        return done(err);
      }
      assert.equal(String(fs.readFileSync('dir/file.txt')), 'file content bar');
      done();
    });
  });

  it('fails if directory does not exist', function(done) {
    fs.appendFile('foo/bar', 'baz', function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.appendFileSync(filename, data, [options]', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/file': 'content'
    });
  });

  it('writes a string to a new file', function() {
    fs.appendFileSync('foo', 'bar');
    assert.equal(String(fs.readFileSync('foo')), 'bar');
  });

  it('appends a string to an existing file', function() {
    fs.appendFileSync('path/to/file', ' bar');
    assert.equal(String(fs.readFileSync('path/to/file')), 'content bar');
  });

  it('fails if directory does not exist', function() {
    assert.throws(function() {
      fs.appendFileSync('foo/bar', 'baz');
    });
  });

});

describe('fs.mkdir(path, [mode], callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'parent': {}
    });
  });

  it('creates a new directory', function(done) {
    fs.mkdir('parent/dir', function(err) {
      if (err) {
        return done(err);
      }
      var stats = fs.statSync('parent/dir');
      assert.isTrue(stats.isDirectory());
      done();
    });
  });

  it('accepts dir mode', function(done) {
    fs.mkdir('parent/dir', 0755, function(err) {
      if (err) {
        return done(err);
      }
      var stats = fs.statSync('parent/dir');
      assert.isTrue(stats.isDirectory());
      assert.equal(stats.mode & 0777, 0755);
      done();
    });
  });

  it('fails if parent does not exist', function(done) {
    fs.mkdir('parent/bogus/dir', function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

  it('fails if directory already exists', function(done) {
    fs.mkdir('parent', function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.mkdirSync(path, [mode])', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'parent': {},
      'file.txt': 'content'
    });
  });

  it('creates a new directory', function() {
    fs.mkdirSync('parent/dir');
    var stats = fs.statSync('parent/dir');
    assert.isTrue(stats.isDirectory());
  });

  it('accepts dir mode', function() {
    fs.mkdirSync('parent/dir', 0755);
    var stats = fs.statSync('parent/dir');
    assert.isTrue(stats.isDirectory());
    assert.equal(stats.mode & 0777, 0755);
  });

  it('fails if parent does not exist', function() {
    assert.throws(function() {
      fs.mkdirSync('parent/bogus/dir');
    });
  });

  it('fails if directory already exists', function() {
    assert.throws(function() {
      fs.mkdirSync('parent');
    });
  });

  it('fails if file already exists', function() {
    assert.throws(function() {
      fs.mkdirSync('file.txt');
    });
  });

});

describe('fs.rmdir(path, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/to/empty': {}
    });
  });

  it('removes an empty directory', function(done) {
    fs.rmdir('path/to/empty', function(err) {
      if (err) {
        return done(err);
      }
      assert.isFalse(fs.existsSync('path/to/empty'));
      done();
    });
  });

  it('fails if not empty', function(done) {
    fs.rmdir('path/to', function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.rmdirSync(path)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/empty': {},
      'file.txt': 'content'
    });
  });

  it('removes an empty directory', function() {
    fs.rmdirSync('path/empty');
    assert.isFalse(fs.existsSync('path/empty'));
  });

  it('fails if directory does not exist', function() {
    assert.throws(function() {
      fs.rmdirSync('path/bogus');
    });
  });

  it('fails if not empty', function() {
    assert.throws(function() {
      fs.rmdirSync('path');
    });
  });

  it('fails if file', function() {
    assert.throws(function() {
      fs.rmdirSync('file.txt');
    });
  });

});

describe('fs.chown(path, uid, gid, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/empty': {},
      'file.txt': 'content'
    });
  });

  it('changes ownership of a file', function(done) {
    fs.chown('file.txt', 42, 43, done);
  });

  it('fails if file does not exist', function(done) {
    fs.chown('bogus.txt', 42, 43, function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.chownSync(path, uid, gid)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/empty': {},
      'file.txt': 'content'
    });
  });

  it('changes ownership of a file', function() {
    fs.chownSync('file.txt', 42, 43);
  });

  it('fails if file does not exist', function() {
    assert.throws(function() {
      fs.chownSync('bogus.txt', 42, 43);
    });
  });

});

describe('fs.fchown(fd, uid, gid, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/empty': {},
      'file.txt': 'content'
    });
  });

  it('changes ownership of a file', function(done) {
    var fd = fs.openSync('file.txt', 'r');
    fs.fchown(fd, 42, 43, done);
  });

});

describe('fs.fchownSync(fd, uid, gid)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'path/empty': {},
      'file.txt': 'content'
    });
  });

  it('changes ownership of a file', function() {
    var fd = fs.openSync('file.txt', 'r');
    fs.fchownSync(fd, 42, 43);
  });

});

describe('fs.chmod(path, mode, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': mock.file({mode: 0644})
    });
  });

  it('changes permissions of a file', function(done) {
    fs.chmod('file.txt', 0664, function(err) {
      if (err) {
        return done(err);
      }
      var stats = fs.statSync('file.txt');
      assert.equal(stats.mode & 0777, 0664);
      done();
    });
  });

  it('fails if file does not exist', function(done) {
    fs.chmod('bogus.txt', 0664, function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.chmodSync(path, mode)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': mock.file({mode: 0666})
    });
  });

  it('changes permissions of a file', function() {
    fs.chmodSync('file.txt', 0644);
    var stats = fs.statSync('file.txt');
    assert.equal(stats.mode & 0777, 0644);
  });

  it('fails if file does not exist', function() {
    assert.throws(function() {
      fs.chmodSync('bogus.txt', 0644);
    });
  });

});

describe('fs.fchmod(fd, mode, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': mock.file({mode: 0666})
    });
  });

  it('changes permissions of a file', function(done) {
    var fd = fs.openSync('file.txt', 'r');
    fs.fchmod(fd, 0644, function(err) {
      if (err) {
        return done(err);
      }
      var stats = fs.statSync('file.txt');
      assert.equal(stats.mode & 0777, 0644);
      done();
    });
  });

});

describe('fs.fchmodSync(fd, mode)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': 'content'
    });
  });

  it('changes permissions of a file', function() {
    var fd = fs.openSync('file.txt', 'r');
    fs.fchmodSync(fd, 0444);
    var stats = fs.statSync('file.txt');
    assert.equal(stats.mode & 0777, 0444);
  });

});

describe('fs.unlink(path, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'dir': {},
      'file.txt': 'content'
    });
  });

  it('deletes a file', function(done) {
    fs.unlink('file.txt', function(err) {
      if (err) {
        return done(err);
      }
      assert.isFalse(fs.existsSync('file.txt'));
      done();
    });
  });

  it('fails for a directory', function(done) {
    fs.unlink('dir', function(err) {
      assert.instanceOf(err, Error);
      assert.isTrue(fs.existsSync('dir'));
      done();
    });
  });

  it('respects previously opened file descriptors', function(done) {
    var fd = fs.openSync('file.txt', 'r');
    fs.unlink('file.txt', function(err) {
      if (err) {
        return done(err);
      }
      assert.isFalse(fs.existsSync('file.txt'));
      // but we can still use fd to read
      var buffer = new Buffer(7);
      var read = fs.readSync(fd, buffer, 0, 7);
      assert.equal(read, 7);
      assert.equal(String(buffer), 'content');
      done();
    });
  });

});

describe('fs.unlinkSync(path)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': 'content'
    });
  });

  it('deletes a file', function() {
    fs.unlinkSync('file.txt');
    assert.isFalse(fs.existsSync('file.txt'));
  });

  it('respects previously opened file descriptors', function() {
    var fd = fs.openSync('file.txt', 'r');
    fs.unlinkSync('file.txt');
    assert.isFalse(fs.existsSync('file.txt'));
    // but we can still use fd to read
    var buffer = new Buffer(7);
    var read = fs.readSync(fd, buffer, 0, 7);
    assert.equal(read, 7);
    assert.equal(String(buffer), 'content');
  });

});

describe('fs.utimes(path, atime, mtime, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'dir': {},
      'file.txt': 'content'
    });
  });

  it('updates timestamps for a file', function(done) {
    fs.utimes('file.txt', new Date(100), new Date(200), function(err) {
      if (err) {
        return done(err);
      }
      var stats = fs.statSync('file.txt');
      assert.equal(stats.atime.getTime(), 100);
      assert.equal(stats.mtime.getTime(), 200);
      done();
    });
  });

  it('updates timestamps for a directory', function(done) {
    fs.utimes('dir', new Date(300), new Date(400), function(err) {
      if (err) {
        return done(err);
      }
      var stats = fs.statSync('dir');
      assert.equal(stats.atime.getTime(), 300);
      assert.equal(stats.mtime.getTime(), 400);
      done();
    });
  });

  it('fails for a bogus path', function(done) {
    fs.utimes('bogus.txt', new Date(100), new Date(200), function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.utimesSync(path, atime, mtime)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': 'content'
    });
  });

  it('updates timestamps for a file', function() {
    fs.utimesSync('file.txt', new Date(100), new Date(200));
    var stats = fs.statSync('file.txt');
    assert.equal(stats.atime.getTime(), 100);
    assert.equal(stats.mtime.getTime(), 200);
  });

});

describe('fs.futimes(fd, atime, mtime, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'dir': {},
      'file.txt': 'content'
    });
  });

  it('updates timestamps for a file', function(done) {
    var fd = fs.openSync('file.txt', 'r');
    fs.futimes(fd, new Date(100), new Date(200), function(err) {
      if (err) {
        return done(err);
      }
      var stats = fs.statSync('file.txt');
      assert.equal(stats.atime.getTime(), 100);
      assert.equal(stats.mtime.getTime(), 200);
      done();
    });
  });

  it('updates timestamps for a directory', function(done) {
    var fd = fs.openSync('dir', 'r');
    fs.futimes(fd, new Date(300), new Date(400), function(err) {
      if (err) {
        return done(err);
      }
      var stats = fs.statSync('dir');
      assert.equal(stats.atime.getTime(), 300);
      assert.equal(stats.mtime.getTime(), 400);
      done();
    });
  });

});

describe('fs.futimesSync(path, atime, mtime)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': 'content'
    });
  });

  it('updates timestamps for a file', function() {
    var fd = fs.openSync('file.txt', 'r');
    fs.futimesSync(fd, new Date(100), new Date(200));
    var stats = fs.statSync('file.txt');
    assert.equal(stats.atime.getTime(), 100);
    assert.equal(stats.mtime.getTime(), 200);
  });

});

describe('fs.link(srcpath, dstpath, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'dir': {},
      'file.txt': 'content'
    });
  });

  it('creates a link to a file', function(done) {
    fs.link('file.txt', 'link.txt', function(err) {
      if (err) {
        return done(err);
      }
      assert.isTrue(fs.statSync('link.txt').isFile());
      assert.equal(String(fs.readFileSync('link.txt')), 'content');
      done();
    });
  });

  it('works if original is renamed', function(done) {
    fs.link('file.txt', 'link.txt', function(err) {
      if (err) {
        return done(err);
      }
      fs.renameSync('file.txt', 'renamed.txt');
      assert.isTrue(fs.statSync('link.txt').isFile());
      assert.equal(String(fs.readFileSync('link.txt')), 'content');
      done();
    });
  });

  it('works if original is removed', function(done) {
    fs.link('file.txt', 'link.txt', function(err) {
      if (err) {
        return done(err);
      }
      fs.unlinkSync('file.txt');
      assert.isTrue(fs.statSync('link.txt').isFile());
      assert.equal(String(fs.readFileSync('link.txt')), 'content');
      done();
    });
  });

  it('fails if original is a directory', function(done) {
    fs.link('dir', 'link', function(err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.linkSync(srcpath, dstpath)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': 'content'
    });
  });

  it('creates a link to a file', function() {
    fs.linkSync('file.txt', 'link.txt');
    assert.isTrue(fs.statSync('link.txt').isFile());
    assert.equal(String(fs.readFileSync('link.txt')), 'content');
  });

  it('works if original is renamed', function() {
    fs.linkSync('file.txt', 'link.txt');
    fs.renameSync('file.txt', 'renamed.txt');
    assert.isTrue(fs.statSync('link.txt').isFile());
    assert.equal(String(fs.readFileSync('link.txt')), 'content');
  });

  it('works if original is removed', function() {
    fs.linkSync('file.txt', 'link.txt');
    fs.unlinkSync('file.txt');
    assert.isTrue(fs.statSync('link.txt').isFile());
    assert.equal(String(fs.readFileSync('link.txt')), 'content');
  });

  it('fails if original is a directory', function() {
    assert.throws(function() {
      fs.linkSync('dir', 'link');
    });
  });

});

describe('fs.symlink(srcpath, dstpath, [type], callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'dir': {},
      'file.txt': 'content'
    });
  });

  it('creates a symbolic link to a file', function(done) {
    fs.symlink('../file.txt', 'dir/link.txt', function(err) {
      if (err) {
        return done(err);
      }
      assert.isTrue(fs.statSync('dir/link.txt').isFile());
      assert.equal(String(fs.readFileSync('dir/link.txt')), 'content');
      done();
    });
  });

  it('breaks if original is renamed', function(done) {
    fs.symlink('file.txt', 'link.txt', function(err) {
      if (err) {
        return done(err);
      }
      assert.isTrue(fs.existsSync('link.txt'));
      fs.renameSync('file.txt', 'renamed.txt');
      assert.isFalse(fs.existsSync('link.txt'));
      done();
    });
  });

  it('works if original is a directory', function(done) {
    fs.symlink('dir', 'link', function(err) {
      if (err) {
        return done(err);
      }
      assert.isTrue(fs.statSync('link').isDirectory());
      done();
    });
  });

});

describe('fs.symlinkSync(srcpath, dstpath, [type])', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'dir': {},
      'file.txt': 'content'
    });
  });

  it('creates a symbolic link to a file', function() {
    fs.symlinkSync('../file.txt', 'dir/link.txt');
    assert.isTrue(fs.statSync('dir/link.txt').isFile());
    assert.equal(String(fs.readFileSync('dir/link.txt')), 'content');
  });

  it('breaks if original is renamed', function() {
    fs.symlinkSync('file.txt', 'link.txt');
    assert.isTrue(fs.existsSync('link.txt'));
    fs.renameSync('file.txt', 'renamed.txt');
    assert.isFalse(fs.existsSync('link.txt'));
  });

  it('works if original is a directory', function() {
    fs.symlinkSync('dir', 'link');
    assert.isTrue(fs.statSync('link').isDirectory());
  });

});

describe('fs.readlink(path, callback)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': 'content',
      'link': mock.symlink({path: './file.txt'})
    });
  });

  it('reads a symbolic link', function(done) {
    fs.readlink('link', function(err, srcPath) {
      if (err) {
        return done(err);
      }
      assert.equal(srcPath, './file.txt');
      done();
    });
  });

  it('fails for regular files', function(done) {
    fs.readlink('file.txt', function(err, srcPath) {
      assert.instanceOf(err, Error);
      done();
    });
  });

});

describe('fs.readlinkSync(path)', function() {

  var fs;
  beforeEach(function() {
    fs = mock.fs({
      'file.txt': 'content',
      'link': mock.symlink({path: './file.txt'})
    });
  });

  it('reads a symbolic link', function() {
    assert.equal(fs.readlinkSync('link'), './file.txt');
  });

  it('fails for regular files', function() {
    assert.throws(function() {
      fs.readlinkSync('file.txt');
    });
  });

});
