import sys

def main():
    with open('ceramic-coating.html', 'r') as f:
        lines = f.readlines()

    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if '<section class="pillars" id="intro">' in line:
            start_idx = i
        if '<section id="contact">' in line:
            end_idx = i
            break

    if start_idx != -1 and end_idx != -1:
        new_content = """
<section id="intro" style="padding: 80px 0;">
  <div class="wrap split-grid">
    <div>
      <div class="sec-tag">// WHAT IS CERAMIC COATING?</div>
      <h2 style="margin-bottom: 24px;">A STRONGER SHIELD FOR YOUR PAINT</h2>
      <p style="color: var(--muted); font-size: 1.1rem; line-height: 1.6; margin-bottom: 16px;">
        Ceramic coating chemically bonds with your vehicle's factory paint, creating a durable, semi-permanent protective layer. This advanced liquid polymer is far superior to traditional waxes.
      </p>
      <ul style="color: var(--muted); font-size: 1.1rem; line-height: 1.6; list-style: none; margin-bottom: 24px; padding: 0;">
        <li style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Bonds with the vehicle's paint
        </li>
        <li style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Creates a durable protective layer
        </li>
        <li style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Helps resist contaminants & environmental exposure
        </li>
        <li style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Improves gloss
        </li>
        <li style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Makes routine cleaning easier
        </li>
      </ul>
      <p style="color: var(--muted); font-size: 1.1rem; line-height: 1.6;">
        At TRIEYE Detailing Studio in Villivakkam, Chennai, we ensure meticulous preparation and application for optimal results.
      </p>
    </div>
    <div>
      <img src="assets/ceramic-coating.jpg" alt="Applying ceramic coating to a car" style="border-radius: 12px; border: 1px solid var(--line); box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
    </div>
  </div>
</section>

<section id="benefits" style="padding: 80px 0; background: var(--bg-panel-2);">
  <div class="wrap">
    <div class="sec-head">
      <div class="sec-tag">// KEY BENEFITS</div>
      <h2>MORE THAN JUST A SHINE</h2>
    </div>
    <div class="pillars-grid" style="margin-top:40px;">
      <div class="pillar-card">
        <div class="pillar-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <h3 class="pillar-title">Deep Gloss</h3>
        <p class="pillar-desc">Enhances the reflective properties of your paint, leaving a wet, mirror-like finish.</p>
      </div>
      <div class="pillar-card">
        <div class="pillar-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h3 class="pillar-title">Hydrophobic Protection</h3>
        <p class="pillar-desc">Repels water and grime instantly, ensuring your vehicle stays cleaner for longer.</p>
      </div>
      <div class="pillar-card">
        <div class="pillar-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        </div>
        <h3 class="pillar-title">Easier Maintenance</h3>
        <p class="pillar-desc">Washing becomes effortless as contaminants struggle to bond with the slick surface.</p>
      </div>
      <div class="pillar-card">
        <div class="pillar-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
        </div>
        <h3 class="pillar-title">Paint Protection</h3>
        <p class="pillar-desc">Protects the clear coat from oxidation, UV damage, and minor environmental stains.</p>
      </div>
      <div class="pillar-card" style="grid-column: 1 / -1; max-width: 400px; justify-self: center;">
        <div class="pillar-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h3 class="pillar-title">Long-Lasting Finish</h3>
        <p class="pillar-desc">Provides durable protection that outlasts traditional waxes and sealants.</p>
      </div>
    </div>
  </div>
</section>

<section id="process" style="padding: 80px 0;">
  <div class="wrap">
    <div class="sec-head">
      <div class="sec-tag">// OUR CERAMIC COATING PROCESS</div>
      <h2>A CAREFUL STEP-BY-STEP PROCESS</h2>
    </div>
    <div class="process-grid">
      <div class="process-step">
        <span class="process-num">01</span>
        <h3 class="process-title">Vehicle Inspection</h3>
        <p class="process-desc">Thorough assessment of paint condition to determine necessary prep work.</p>
      </div>
      <div class="process-step">
        <span class="process-num">02</span>
        <h3 class="process-title">Deep Wash & Decontamination</h3>
        <p class="process-desc">Safe snow foam wash, followed by iron fallout removal and clay bar treatment.</p>
      </div>
      <div class="process-step">
        <span class="process-num">03</span>
        <h3 class="process-title">Paint Preparation</h3>
        <p class="process-desc">Machine polishing to remove swirls and defects, creating an ideal bonding surface.</p>
      </div>
      <div class="process-step">
        <span class="process-num">04</span>
        <h3 class="process-title">Ceramic Application</h3>
        <p class="process-desc">Meticulous hand-application of the ceramic coating to all painted surfaces.</p>
      </div>
      <div class="process-step">
        <span class="process-num">05</span>
        <h3 class="process-title">Final Inspection</h3>
        <p class="process-desc">Controlled curing and thorough quality control check under studio lighting.</p>
      </div>
    </div>
  </div>
</section>

<section id="why-trieye" class="why-trieye-section">
  <div class="wrap">
    <div class="sec-tag">// WHY TRIEYE</div>
    <h2 style="font-size: 32px; margin-top: 16px;">DETAIL &bull; PRECISION &bull; PROTECTION</h2>
    <ul class="why-trieye-list">
      <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Careful preparation in a controlled environment</li>
      <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Quality workmanship by trained professionals</li>
      <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Professional application techniques</li>
      <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Uncompromising attention to detail</li>
      <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Clean, flawless final finish</li>
    </ul>
    <div style="margin-top: 40px;">
      <a href="/#booking" class="btn btn-hero-primary" style="display: inline-flex;">BOOK CERAMIC COATING &rarr;</a>
    </div>
  </div>
</section>

<section id="results" style="padding: 80px 0;">
  <div class="wrap">
    <div class="sec-head">
      <div class="sec-tag">// REAL RESULTS</div>
      <h2>BEFORE & AFTER</h2>
      <p style="color: var(--muted); margin-top: 12px;">See the transformation achieved in our studio.</p>
    </div>
    <div class="results-grid">
      <div class="result-card">
        [ Before/After Image Placeholder ]
      </div>
      <div class="result-card">
        [ Before/After Image Placeholder ]
      </div>
    </div>
  </div>
</section>

"""
        lines = lines[:start_idx] + [new_content] + lines[end_idx:]
        with open('ceramic-coating.html', 'w') as f:
            f.writelines(lines)
        print("Successfully updated ceramic-coating.html")
    else:
        print(f"Could not find section boundaries: start={start_idx}, end={end_idx}")

if __name__ == '__main__':
    main()
