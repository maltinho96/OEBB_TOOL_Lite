// Registry aller Protokolltypen. ui/formular.js haengt jeden Eintrag als
// eigenen <section class="tab"> in #app ein. Neuer Protokolltyp = neues
// Modul in schema/ + ein Eintrag hier, sonst nichts anzufassen.

import { begehung } from './begehung.js';
import { vorbegehung } from './vorbegehung.js';
import { belehrung } from './belehrung.js';

export const schemaRegistry = [begehung, vorbegehung, belehrung];