import { describe, it } from 'mocha';
import { expect } from 'chai';
import { WikiLinkProcessor } from '../../../src/processors/WikiLinkProcessor';

// Behavioural examples derived from detailed design docs.
// These tests serve as executable documentation for WikiLink parsing/resolution.

describe('WikiLinkProcessor (Design Examples)', () => {
  const processor = new WikiLinkProcessor();

  describe('parseWikiLink', () => {
    it('parses [[Page]] basic link', () => {
      const parsed = processor.parseWikiLink('Page');
      expect(parsed.pageName).to.equal('Page');
      expect(parsed.heading).to.equal(undefined);
      expect(parsed.displayName).to.equal(undefined);
      expect(parsed.isAlias).to.equal(false);
    });

    it('parses [[Page|Display Name]] alias link', () => {
      const parsed = processor.parseWikiLink('Page|Display Name');
      expect(parsed.pageName).to.equal('Page');
      expect(parsed.displayName).to.equal('Display Name');
      expect(parsed.isAlias).to.equal(true);
    });

    it('parses [[Page#Heading]] heading link', () => {
      const parsed = processor.parseWikiLink('Page#Heading');
      expect(parsed.pageName).to.equal('Page');
      expect(parsed.heading).to.equal('Heading');
      expect(parsed.isAlias).to.equal(false);
    });

    it('parses [[Page#Heading|Display]] alias + heading', () => {
      const parsed = processor.parseWikiLink('Page#Heading|Display');
      expect(parsed.pageName).to.equal('Page');
      expect(parsed.heading).to.equal('Heading');
      expect(parsed.displayName).to.equal('Display');
      expect(parsed.isAlias).to.equal(true);
    });
  });

  describe('transformFileName (slug strategies)', () => {
    it('passthrough leaves names as-is', () => {
      const p = new WikiLinkProcessor({ slugStrategy: 'passthrough' });
      expect(p.transformFileName('My Page 01')).to.equal('My Page 01');
    });
    it('kebab-case lowercases and hyphenates', () => {
      const p = new WikiLinkProcessor({ slugStrategy: 'kebab-case' });
      expect(p.transformFileName('My Page/Name')).to.equal('my-page-name');
    });
    it('snake_case lowercases and underscores, strips specials', () => {
      const p = new WikiLinkProcessor({ slugStrategy: 'snake_case' });
      expect(p.transformFileName('My Page:Name')).to.equal('my_page_name');
    });
  });
});
