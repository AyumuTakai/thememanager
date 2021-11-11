import { CliFlags } from './config';
import { Entry } from './entry';

import { FileTheme } from './FileTheme';
import { PackageTheme } from './PackageTheme';
import { UriTheme } from './UriTheme';


import {
  ContentsEntryObject,
  EntryObject,
  VivliostyleConfigSchema,
} from './schema/vivliostyle.config';


export type ParsedTheme = UriTheme | FileTheme | PackageTheme;

export type MetaData = {
  title?: string;
  theme?: ParsedTheme[];
};

export type ParsedStyle = {
  name: string;
  maybeStyle: string;
};

/**
 * Theme base class
 */
export class Theme {
  name: string;
  location: string;
  entries: Entry[];

  public constructor(name: string, location: string) {
    this.name = name;
    this.location = location;
    this.entries = [];
  }

  /**
   * check url string
   * @param str
   * ivate
   */
  protected static isURL(str: string) {
    return /^https?:\/\//.test(str);
  }

  /**
   *
   * @param from
   */
  public locateThemePath(from: string): string[] {
    // subclasses must implement
    return [];
  }

  /**
   * copy theme file or package to workspace
   */
  public copyTheme(): void {
    // subclasses must implement
  }
}

/**
 * Theme management class
 * There are four types of themes, which are applied exclusively to each document file.
 * 1. specified in the theme field of the vivliostyle.config.js
 * 2. specified by the argument of cli
 * 3. specified in the .md file's metadata
 * 4. specified in the entry field of the vivliostyle.config.js
 * If more than one type is specified, the order of priority is 4 > 3 > 2 > 1
 */
export class ThemeManager extends Array<ParsedTheme> {
  // theme specified by the argument of cli
  private cliThemes: ParsedTheme[] = [];
  // theme specified in the theme field of the vivliostyle.config.js
  private configThemes: ParsedTheme[] = [];

  /**
   * parse theme locator
   * @param locator "theme"
   * @param contextDir
   * @param workspaceDir
   */
  private static parseTheme(
    locator: string | undefined,
    contextDir: string,
    workspaceDir: string,
    vars: Object | undefined = undefined,
  ): ParsedTheme | undefined {
    if (typeof locator !== 'string' || locator == '') {
      return undefined;
    }

    return (
      UriTheme.parse(locator) ?? // url
      PackageTheme.parse(locator, contextDir, workspaceDir, vars) ?? // node_modules, local pkg
      FileTheme.parse(locator, contextDir, workspaceDir, vars) ?? // bare .css file
      undefined
    );
  }

  /**
   * parse theme(s)
   * @param locators ["theme1","theme2"] | "theme" | undefined
   * @param contextDir
   * @param workspaceDir
   * @return ParsedTheme[]
   */
  public static parseThemes(
    locators: string[] | string | undefined,
    contextDir: string,
    workspaceDir: string,
    vars: Object | undefined = undefined,
    entry: Entry | undefined = undefined,
  ): ParsedTheme[] {
    const themes: ParsedTheme[] = [];

    const parse_theme = (locator: string | undefined) => {
      const theme = ThemeManager.parseTheme(
        locator,
        contextDir,
        workspaceDir,
        vars,
      );
      if (theme) {
        if (entry) {
          theme.entries.push(entry);
        }
        themes.push(theme);
      }
    };

    if (Array.isArray(locators)) {
      for (const locator of locators) {
        parse_theme(locator);
      }
    } else {
      parse_theme(locators);
    }
    return themes;
  }

  /**
   * add a theme to themeIndexes
   * @param theme
   */
  private addUsedTheme(theme: ParsedTheme | undefined): void {
    // if already registered, don't add it.
    if (theme && this.every((t) => t.location !== theme.location)) {
      this.push(theme);
    }
  }

  /**
   * add themes to themeIndexes
   * @param themes
   * @private
   */
  private addThemes(themes: ParsedTheme[]): void {
    themes.map((t) => this.addUsedTheme(t));
  }

  /**
   * theme from vivliostyle.config.js
   * @param config
   * @param contextDir
   * @param workspaceDir
   */
  setConfigTheme(
    config: VivliostyleConfigSchema | undefined,
    contextDir: string,
    workspaceDir: string,
  ): void {
    if (config) {
      this.configThemes = this.configThemes.concat(
        ThemeManager.parseThemes(config.theme, contextDir, workspaceDir),
      );
    }
  }

  /**
   * theme from cli flags
   * varsの指定はできない
   * @param cliFlags
   * @param workspaceDir
   */
  setCliTheme(cliFlags: CliFlags, workspaceDir: string) {
    const themes = ThemeManager.parseThemes(
      cliFlags.theme,
      process.cwd(),
      workspaceDir,
    );
    if (themes) {
      this.cliThemes = this.cliThemes.concat(themes);
    }
  }

  /**
   * parse theme for each entry
   * @param metadata
   * @param entry
   * @param contextDir
   * @param workspaceDir
   */
  resolveEntryTheme(
    metadata: MetaData,
    entry: EntryObject | ContentsEntryObject | undefined,
    contextDir: string,
    workspaceDir: string,
    manuscriptEntry: Entry,
  ): ParsedTheme[] {
    // entryにvarsが設定されていて、かつSCSSの場合にはエントリ別のCSSにトランスパイルする
    const entryThemes = ThemeManager.parseThemes(
      entry?.theme,
      contextDir,
      workspaceDir,
      entry?.vars,
      manuscriptEntry,
    );
    const themes =
      entryThemes.length != 0
        ? entryThemes
        : metadata.theme && metadata.theme?.length != 0
        ? metadata.theme
        : this.rootTheme();
    this.addThemes(themes);
    return themes;
  }

  /**
   * theme specified in the CLI or config
   * @return array of themes
   */
  rootTheme(): ParsedTheme[] {
    const themes =
      this.cliThemes.length != 0
        ? this.cliThemes
        : this.configThemes.length != 0
        ? this.configThemes
        : [];
    this.addThemes(themes);
    return themes;
  }

  /**
   * Theme for table of contents
   * Table of contents cannot be themed by metadata
   * @param entry
   * @param context
   * @param workspaceDir
   * @return theme specified in root theme or entry theme
   */
  tocTheme(
    entry: EntryObject | ContentsEntryObject,
    context: string,
    workspaceDir: string,
  ): ParsedTheme[] {
    const entryThemes = ThemeManager.parseThemes(
      entry.theme,
      context,
      workspaceDir,
    );
    const themes = entryThemes.length != 0 ? entryThemes : this.rootTheme();
    this.addThemes(themes);
    return themes;
  }

  /**
   * single input file has no entry theme
   * @param metadata
   */
  singleInputTheme(metadata: {
    title?: string;
    theme?: ParsedTheme[];
  }): ParsedTheme[] {
    const themes =
      metadata.theme && metadata.theme.length != 0
        ? metadata.theme
        : this.rootTheme();
    this.addThemes(themes);
    return themes;
  }

  /**
   * copy style files to destination
   */
  public copyThemes(): void {
    for (const theme of this) {
      theme.copyTheme();
    }
  }
}
