import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// This suite asserts that the public surface (commands, activation events,
// keybindings, configuration) conforms to the documented design.
// It acts as a living spec: if new public features are added, either update
// the design docs and these expectations, or the test will fail.

describe('Design Conformance (Public Surface)', () => {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  it('commands match the documented set', () => {
    const expected = [
      'obsd.handleEnterKey',
      'obsd.insertDate',
      'obsd.insertTime',
      'obsd.openDailyNote',
      'obsd.openOrCreateWikiLink',
      'obsd.openQuickCapture',
      'obsd.preview',
    ].sort();

    const actual: string[] = (pkg.contributes?.commands || []).map((c: any) => c.command).sort();
    expect(actual).to.deep.equal(expected);
  });

  it('activationEvents match the documented set', () => {
    const expected = [
      'onLanguage:markdown',
      'onCommand:obsd.openOrCreateWikiLink',
      'onCommand:obsd.insertDate',
      'onCommand:obsd.insertTime',
      'onCommand:obsd.openQuickCapture',
      'onCommand:obsd.preview',
      'onCommand:obsd.openDailyNote',
      'onCommand:obsd.handleEnterKey',
    ].sort();
    const actual: string[] = (pkg.activationEvents || []).slice().sort();
    expect(actual).to.deep.equal(expected);
  });

  it('keybindings only reference documented commands and have valid "when" clauses', () => {
    const allowed = new Set([
      'obsd.openOrCreateWikiLink',
      'obsd.insertDate',
      'obsd.insertTime',
      'obsd.handleEnterKey',
    ]);
    const bindings: any[] = pkg.contributes?.keybindings || [];
    // all commands are allowed
    for (const kb of bindings) {
      expect(allowed.has(kb.command), `Unexpected keybinding command: ${kb.command}`).to.be.true;
      expect(typeof kb.key).to.equal('string');
      if (kb.when) expect(typeof kb.when).to.equal('string');
    }
    // specific critical context checks per design
    const enterBinding = bindings.find(b => b.command === 'obsd.handleEnterKey');
    expect(enterBinding?.when).to.equal("editorTextFocus && editorLangId == 'markdown'");

    const openBinding = bindings.find(b => b.command === 'obsd.openOrCreateWikiLink');
    expect(openBinding?.when).to.include('obsd.inWikiLink');
  });

  it('configuration keys match documented set and provide defaults', () => {
    const props = pkg.contributes?.configuration?.properties || {};
    const keys = Object.keys(props).sort();
    const expectedKeys = [
      'obsd.vaultRoot',
      'obsd.noteExtension',
      'obsd.slugStrategy',
      'obsd.dateFormat',
      'obsd.timeFormat',
      'obsd.template',
      'obsd.dailyNoteTemplate',
      'obsd.dailyNotePath',
      'obsd.dailyNoteEnabled',
      'obsd.notesFolder',
      'obsd.dailyNoteFormat',
      'obsd.captureSectionName',
      'obsd.listContinuationEnabled',
      'obsd.searchSubdirectories',
      'obsd.dailyNoteKeybindingGuide',
    ].sort();
    expect(keys).to.deep.equal(expectedKeys);

    // Spot-check important defaults to align with docs
    expect(props['obsd.noteExtension'].default).to.equal('.md');
    expect(props['obsd.dateFormat'].default).to.be.a('string');
    expect(props['obsd.timeFormat'].default).to.be.a('string');
    expect(props['obsd.dailyNoteEnabled'].default).to.equal(true);
    expect(props['obsd.dailyNotePath'].default).to.equal('dailynotes');
    expect(props['obsd.notesFolder'].default).to.equal('dailynotes');
    expect(props['obsd.dailyNoteFormat'].default).to.equal('YYYY-MM-DD.md');
    expect(props['obsd.captureSectionName'].default).to.be.a('string');
  });

  it('does not contribute undocumented views', () => {
    // Design does not include custom view contributions in root manifest
    expect(pkg.contributes?.views).to.be.undefined;
  });
});
