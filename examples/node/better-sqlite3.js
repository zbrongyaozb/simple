var path = require("path");
const process = require('process');
const argv = key => {
    // Return true if the key exists and a value is defined
    if (process.argv.includes(`--${key}`)) return true;
    const value = process.argv.find(element => element.startsWith(`--${key}=`));
    // Return null if the key does not exist and a value is not defined
    if (!value) return null;
    return value.replace(`--${key}=`, '');
}

var ext_path = path.resolve("./lib/");
if (argv('ext_path')) {
    ext_path = argv('ext_path');
}
var dict_path = path.join(ext_path, "dict");
if (argv('dict_path')) {
    dict_path = argv('dict_path');
}
console.log("extension path: " + ext_path + ", dict path: " + dict_path);

const db = require('better-sqlite3')(':memory:', { verbose: console.log });
var platform = process.env.npm_config_target_platform || process.platform
if (platform === 'win32') {
    db.loadExtension(path.join(ext_path, "simple"));
} else {
    db.loadExtension(path.join(ext_path, "libsimple"));
}
// test simple_query
const row = db.prepare('select simple_query(\'pinyin\') as query').get();

// set the jieba dict file path
db.prepare("select jieba_dict(?)").run(dict_path);
db.prepare("CREATE VIRTUAL TABLE t1 USING fts5(x, tokenize = 'simple')").run();
// insert some data
db.prepare("insert into t1(x) values ('周杰伦 Jay Chou:我已分不清，你是友情还是错过的爱情'), ('周杰伦 Jay Chou:最美的不是下雨天，是曾与你躲过雨的屋檐'), ('I love China! 我爱中国！我是中华人民共和国公民！'), ('@English &special _characters.\"''bacon-&and''-eggs%')").run();

// with match 周杰伦
db.prepare("select rowid as id, simple_highlight(t1, 0, '[', ']') as info from t1 where x match simple_query('zjl')").all().forEach(e => {
    console.log('match 周杰伦 zjl', e)
})
// will match 中国 and 中华人民共和国
db.prepare("select rowid as id, simple_highlight(t1, 0, '[', ']') as info from t1 where x match simple_query('中国')").all().forEach(e => {
    console.log('will match [中国] and [中]华人民共和[国]', e);
});
// will match 中国 but not 中华人民共和国
db.prepare("select rowid as id, simple_highlight(t1, 0, '[', ']') as info from t1 where x match jieba_query('中国')").all().forEach((e) => {
    console.log('will match [中国] but not 中华人民共和国', e);
});

