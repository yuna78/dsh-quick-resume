/**
 * Host half of the Quick Phrases bundle.
 *
 * The feature is entirely a browser-side control: a row of quick-phrase
 * buttons under the composer that send a saved phrase (default "请继续") into
 * the current Session, plus an inline settings panel for the button count,
 * labels, phrases, and icons. The browser half lives in `client.js`; this row
 * exists so the bundle is a normal, listable, toggleable plugin instead of a
 * loose client module.
 *
 * @module dsh-plugin-quick-resume
 */

/** No Host-side contributions; everything is registered by the Client half. */
export function apply() {}
