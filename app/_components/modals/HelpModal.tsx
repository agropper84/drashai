'use client';
// Thorough feature guide and help reference for the app.

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-shroud" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-eyebrow">Guide</div>
        <h2 className="modal-title">דרשאי</h2>
        <div className="modal-title-en">How to use Drashai</div>

        <div className="help-content">

          <section className="help-section">
            <h3>Files</h3>
            <p>Each file represents an encounter &mdash; a meeting, conversation, or event you want to capture and build on.</p>
            <ul>
              <li><strong>Create a file</strong> &mdash; click the <kbd>+</kbd> button on the Files page. Enter the congregant name, date, and choose a template type (sermon, eulogy, teaching, dvar torah, pastoral letter, or meeting summary).</li>
              <li><strong>Tabs</strong> &mdash; each file has tabs: Conversation (transcript &amp; notes), Documents, Sources, Insights (sparks), Draft, and Final.</li>
              <li><strong>Archive / Delete</strong> &mdash; swipe or use the menu to archive completed files. Archived files can be restored.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Recording &amp; Transcription</h3>
            <p>Record encounters directly in the app. Audio is transcribed automatically using ElevenLabs Scribe.</p>
            <ul>
              <li><strong>Start recording</strong> &mdash; open a file and tap the microphone icon. Consent is required once, then subsequent recordings start immediately.</li>
              <li><strong>Speaker diarization</strong> &mdash; the transcription identifies different speakers automatically.</li>
              <li><strong>Moment markers</strong> &mdash; while recording, tap the flag icon to mark important moments with a label and timestamp.</li>
              <li><strong>Recording bar</strong> &mdash; a global bar at the bottom-right shows elapsed time, a live waveform, and input level. Survives navigation between pages.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Dictation</h3>
            <p>Dictate directly into your draft using the mic icon in the paper&rsquo;s top-right corner.</p>
            <ul>
              <li><strong>Tap on/off</strong> &mdash; tap the mic to start recording, tap again to stop. Transcribes with basic cleanup (filler removal, spoken punctuation conversion).</li>
              <li><strong>Hold &amp; release</strong> &mdash; hold the mic for 300ms+ then release. This records while held and automatically runs AI refinement on release &mdash; fixing terminology, cleaning grammar, and formatting the text.</li>
              <li><strong>Language toggle</strong> &mdash; click the language indicator (EN/עב) next to the mic to switch between English and Hebrew transcription.</li>
              <li><strong>Settings</strong> &mdash; customize in Settings → Dictation: refinement prompt, dictionary (130+ rabbinical terms), filler word list, spoken punctuation, insert mode (append or replace).</li>
              <li><strong>Verbatim desktop app</strong> &mdash; for system-wide dictation on macOS, download Verbatim for Rabbis from Settings → Dictation. Press a hotkey to dictate into any app on your Mac.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Sources &amp; Library</h3>
            <p>Search Torah, Talmud, Midrash, and commentary via Sefaria&rsquo;s database.</p>
            <ul>
              <li><strong>Keyword search</strong> &mdash; short queries search Sefaria directly.</li>
              <li><strong>Smart search</strong> &mdash; paste longer text or ask a question. AI decomposes your query into targeted searches, fetches results in parallel, and ranks them by relevance.</li>
              <li><strong>Deep search</strong> &mdash; toggle &ldquo;Deep&rdquo; next to the search button for a thorough multi-source dive. Uses broader decomposition (8&ndash;12 search terms), follow-up angles, related text expansion, and Sonnet-powered ranking. Returns up to 30 results.</li>
              <li><strong>Synthesize</strong> &mdash; after a search returns results, click &ldquo;Synthesize answer&rdquo; to get a streaming AI synthesis with inline source citations.</li>
              <li><strong>Attach sources</strong> &mdash; from search results, use the dropdown to attach a source to any file.</li>
              <li><strong>Highlight to search</strong> &mdash; select text anywhere, then click &ldquo;Find sources&rdquo; in the floating menu. The source search opens pre-filled with your selection.</li>
              <li><strong>Library</strong> &mdash; save sources to your personal library, organized by folder.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Scholar</h3>
            <p>The Scholar panel (at the top of the Library page) provides comprehensive, source-cited answers to rabbinical questions &mdash; like OpenEvidence for Torah scholarship.</p>
            <ul>
              <li><strong>Ask a question</strong> &mdash; type any question about Jewish law, theology, history, or practice. Example: &ldquo;Why do we wear a kippah?&rdquo;</li>
              <li><strong>Deep research</strong> &mdash; Scholar performs a deep search across Torah, Talmud, Midrash, Halacha, and commentaries, finding 20&ndash;30+ relevant sources.</li>
              <li><strong>Structured synthesis</strong> &mdash; the answer is organized by source layer: Biblical foundation → Talmudic discussion → Rishonim → Acharonim → contemporary practice. Different opinions are presented with their holders and reasoning.</li>
              <li><strong>Inline citations</strong> &mdash; every claim cites its source (e.g., &ldquo;Shabbat 156b&rdquo;). Click &ldquo;Show sources&rdquo; to expand the full source list with relevance explanations.</li>
              <li><strong>Copy &amp; reuse</strong> &mdash; copy the answer for use in sermons, shiurim, or further research.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Sparks</h3>
            <p>Sparks are quick notes, ideas, and insights that can be attached to files or kept freestanding.</p>
            <ul>
              <li><strong>Create a spark</strong> &mdash; from the Sparks page, or highlight text anywhere and click &ldquo;To Sparks&rdquo; in the floating menu.</li>
              <li><strong>Assign to a file</strong> &mdash; link a spark to a specific encounter. Assigned sparks are included as context when generating a draft.</li>
              <li><strong>Merge sparks</strong> &mdash; combine related sparks into one.</li>
              <li><strong>Tags &amp; categories</strong> &mdash; organize sparks with tags (e.g., Theme, Quote, Story).</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Templates</h3>
            <p>Templates define the structure and AI prompt for each document type.</p>
            <ul>
              <li><strong>Built-in templates</strong> &mdash; Sermon, Eulogy, Teaching, Dvar Torah, Pastoral Letter, Meeting Summary.</li>
              <li><strong>Custom templates</strong> &mdash; create your own with a custom prompt, sections, and variables.</li>
              <li><strong>Template body</strong> &mdash; optionally provide a skeleton structure the AI will follow.</li>
              <li><strong>Variables</strong> &mdash; control which sources the AI receives (transcript, notes, sparks, sources).</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Draft &amp; AI Generation</h3>
            <p>The Draft tab is your writing workspace with AI assistance.</p>
            <ul>
              <li><strong>Writing</strong> &mdash; type freely in the paper. Word count and estimated reading time are shown.</li>
              <li><strong>AI Helper</strong> (<kbd>⌘J</kbd>) &mdash; opens the floating AI panel with two tabs:
                <ul>
                  <li><strong>Generate</strong> &mdash; select which sources to include (transcript, notes, sources, sparks, your draft), set the voice level, and add direction (tone, length, thesis). Click Generate.</li>
                  <li><strong>Ask</strong> &mdash; ask the AI for advice on structure, sources, direction, or anything else without generating a full draft.</li>
                </ul>
              </li>
              <li><strong>Voice slider</strong> &mdash; 4 stops control how much AI involvement:
                <ul>
                  <li><em>My words</em> &mdash; fact-check only</li>
                  <li><em>I lead</em> &mdash; AI suggests, you decide</li>
                  <li><em>Co-author</em> &mdash; collaborative writing</li>
                  <li><em>AI drafts</em> &mdash; full AI generation</li>
                </ul>
              </li>
              <li><strong>Formatting</strong> &mdash; <kbd>⌘B</kbd> bold, <kbd>⌘I</kbd> italic, <kbd>⌘U</kbd> underline.</li>
              <li><strong>Zen mode</strong> (<kbd>⌘.</kbd>) &mdash; distraction-free writing. Everything hides except the text. Hover to reveal controls. Press <kbd>Esc</kbd> to exit.</li>
              <li><strong>Live translate</strong> (<kbd>⌘T</kbd>) &mdash; opens a side-by-side translation panel. Two modes: translate all text or translate highlighted selection. Insert translations back into your draft.</li>
              <li><strong>Edit &amp; delete</strong> &mdash; previous AI drafts can be edited or removed.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Final Tab</h3>
            <p>Review and export your finished document.</p>
            <ul>
              <li><strong>Word download</strong> &mdash; export as a .doc file with formatting preserved.</li>
              <li><strong>Seal</strong> &mdash; mark a document as delivered/complete.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Selection Menu</h3>
            <p>Highlight any text in a selectable area to see a floating toolbar with:</p>
            <ul>
              <li><strong>Find sources</strong> &mdash; search Sefaria for related texts</li>
              <li><strong>Translate</strong> &mdash; instant Hebrew/English translation</li>
              <li><strong>To Sparks</strong> &mdash; save the selection as a new spark</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Settings</h3>
            <ul>
              <li><strong>AI &amp; API Keys</strong> &mdash; add your Anthropic (Claude) and ElevenLabs API keys. Choose your preferred AI model (Sonnet, Opus, Haiku) and set the max tokens per query.</li>
              <li><strong>Transcription</strong> &mdash; configure language, noise reduction, and recording retention for ElevenLabs Scribe.</li>
              <li><strong>Dictation</strong> &mdash; customize the refinement prompt, rabbinical dictionary (130+ terms), filler words, spoken punctuation, and insert mode. Download the Verbatim desktop app for system-wide dictation.</li>
              <li><strong>Appearance</strong> &mdash; choose Warm (parchment), Cool (slate), or Sacred (deep blue/gold), each with light and dark mode. Set zen mode default.</li>
              <li><strong>Workflows</strong> &mdash; define phase sequences paired with templates for structured pastoral care.</li>
              <li><strong>Privacy</strong> &mdash; configure pastoral seal defaults and auto-redaction for exports.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Keyboard Shortcuts</h3>
            <table className="help-shortcuts">
              <tbody>
                <tr><td><kbd>⌘J</kbd></td><td>Open AI helper</td></tr>
                <tr><td><kbd>⌘T</kbd></td><td>Toggle live translation</td></tr>
                <tr><td><kbd>⌘.</kbd></td><td>Toggle zen mode</td></tr>
                <tr><td><kbd>⌘B</kbd></td><td>Bold</td></tr>
                <tr><td><kbd>⌘I</kbd></td><td>Italic</td></tr>
                <tr><td><kbd>⌘U</kbd></td><td>Underline</td></tr>
                <tr><td><kbd>Esc</kbd></td><td>Exit zen mode / close panels</td></tr>
              </tbody>
            </table>
          </section>

          <section className="help-section">
            <h3>Privacy &amp; Data</h3>
            <p>All sensitive data (transcripts, notes, sources, audio) is encrypted with AES-256-GCM and stored in your personal Google Drive. Drashai never stores pastoral content on shared servers. Your encryption key is unique to your account.</p>
          </section>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
