import re

files_to_process = [
    'docs/index.html',
    'docs/MRP/index.html',
    'docs/research.html'
]

def wrap_section(content, section_id, new_heading=None):
    start_tag = f'<section id="{section_id}">'
    end_tag = '</section>'
    
    if start_tag not in content:
        return content
        
    start_idx = content.find(start_tag)
    end_idx = content.find(end_tag, start_idx) + len(end_tag)
    
    section_content = content[start_idx:end_idx]
    
    if '<div class="expandable-wrapper"' in section_content:
        return content
    
    h2_match = re.search(r'(<h2>)(.*?)(</h2>)', section_content)
    if not h2_match:
        return content
        
    old_h2 = h2_match.group(0)
    inner_heading = new_heading if new_heading else h2_match.group(2)
    
    after_h2_start = section_content.find(old_h2) + len(old_h2)
    before_end = section_content.rfind('</section>')
    
    inner_html = section_content[after_h2_start:before_end]
    
    new_section_content = (
        f'{start_tag}\n'
        f'              <h2>{inner_heading}</h2>\n'
        f'              <div class="expandable-wrapper" data-expandable>\n'
        f'                <div class="expandable-content">'
        f'{inner_html}'
        f'                </div>\n'
        f'                <div class="expandable-actions">\n'
        f'                  <button class="view-more-btn" type="button">View more..</button>\n'
        f'                </div>\n'
        f'              </div>\n'
        f'            </section>'
    )
    
    return content[:start_idx] + new_section_content + content[end_idx:]

for path in files_to_process:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('Executive Summary', 'Overview')
    
    content = wrap_section(content, 'summary', 'Overview')
    content = wrap_section(content, 'direction')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
