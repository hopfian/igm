import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const widgetPath = path.resolve(__dirname, '../node_modules/blessed/lib/widget.js');
const tputPath = path.resolve(__dirname, '../node_modules/blessed/lib/tput.js');

if (fs.existsSync(widgetPath)) {
  let content = fs.readFileSync(widgetPath, 'utf8');
  const replaceStr = `widget.classes.forEach(function(name) {
  var file = name.toLowerCase();
  widget[name] = widget[file] = require('./widgets/' + file);
});`;

  const newStr = `widget.classes.forEach(function(name) {
  var file = name.toLowerCase();
});
widget.Node = widget.node = require('./widgets/node');
widget.Screen = widget.screen = require('./widgets/screen');
widget.Element = widget.element = require('./widgets/element');
widget.Box = widget.box = require('./widgets/box');
widget.Text = widget.text = require('./widgets/text');
widget.Line = widget.line = require('./widgets/line');
widget.ScrollableBox = widget.scrollablebox = require('./widgets/scrollablebox');
widget.ScrollableText = widget.scrollabletext = require('./widgets/scrollabletext');
widget.BigText = widget.bigtext = require('./widgets/bigtext');
widget.List = widget.list = require('./widgets/list');
widget.Form = widget.form = require('./widgets/form');
widget.Input = widget.input = require('./widgets/input');
widget.Textarea = widget.textarea = require('./widgets/textarea');
widget.Textbox = widget.textbox = require('./widgets/textbox');
widget.Button = widget.button = require('./widgets/button');
widget.ProgressBar = widget.progressbar = require('./widgets/progressbar');
widget.FileManager = widget.filemanager = require('./widgets/filemanager');
widget.Checkbox = widget.checkbox = require('./widgets/checkbox');
widget.RadioSet = widget.radioset = require('./widgets/radioset');
widget.RadioButton = widget.radiobutton = require('./widgets/radiobutton');
widget.Prompt = widget.prompt = require('./widgets/prompt');
widget.Question = widget.question = require('./widgets/question');
widget.Message = widget.message = require('./widgets/message');
widget.Loading = widget.loading = require('./widgets/loading');
widget.Listbar = widget.listbar = require('./widgets/listbar');
widget.Log = widget.log = require('./widgets/log');
widget.Table = widget.table = require('./widgets/table');
widget.ListTable = widget.listtable = require('./widgets/listtable');
widget.Terminal = widget.terminal = require('./widgets/terminal');
widget.Image = widget.image = require('./widgets/image');
widget.ANSIImage = widget.ansiimage = require('./widgets/ansiimage');
widget.OverlayImage = widget.overlayimage = require('./widgets/overlayimage');
widget.Video = widget.video = require('./widgets/video');
widget.Layout = widget.layout = require('./widgets/layout');
`;

  if (content.includes(replaceStr)) {
    fs.writeFileSync(widgetPath, content.replace(replaceStr, newStr));
    console.log('Patched blessed/lib/widget.js for bundler compatibility.');
  }
}

if (fs.existsSync(tputPath)) {
  let content = fs.readFileSync(tputPath, 'utf8');
  
  const base64Xterm = fs.readFileSync(path.resolve(__dirname, '../node_modules/blessed/usr/xterm')).toString('base64');
  const base64WindowsAnsi = fs.readFileSync(path.resolve(__dirname, '../node_modules/blessed/usr/windows-ansi')).toString('base64');
  const base64Xterm256 = fs.readFileSync(path.resolve(__dirname, '../node_modules/blessed/usr/xterm-256color')).toString('base64');

  const replaceStr = `  file = path.normalize(this._prefix(term));
  data = fs.readFileSync(file);`;

  const newStr = `  file = path.normalize(this._prefix(term));
  try {
    data = fs.readFileSync(file);
  } catch (e) {
    if (file.includes('windows-ansi')) data = Buffer.from('${base64WindowsAnsi}', 'base64');
    else if (file.includes('xterm-256color')) data = Buffer.from('${base64Xterm256}', 'base64');
    else if (file.includes('xterm')) data = Buffer.from('${base64Xterm}', 'base64');
    else throw e;
  }`;

  if (content.includes(replaceStr)) {
    fs.writeFileSync(tputPath, content.replace(replaceStr, newStr));
    console.log('Patched blessed/lib/tput.js for SEA compatibility.');
  }
}
