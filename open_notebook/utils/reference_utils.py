import re
from typing import Dict, List, Optional, Tuple

from open_notebook.domain.notebook import Source


def parse_references(text: str) -> List[Tuple[str, str, int, int]]:
    """
    Parse references from text.
    
    Returns list of (type, id, start_index, end_index) tuples.
    """
    pattern = r"source:([a-zA-Z0-9_]+)"
    matches = []
    
    for match in re.finditer(pattern, text):
        ref_type = "source"
        ref_id = match.group(1)
        matches.append((ref_type, ref_id, match.start(), match.end()))
    
    return matches


async def fetch_reference_titles(
    references: List[Tuple[str, str, int, int]]
) -> Dict[str, str]:
    """
    Fetch titles for all references.
    
    Returns dict mapping "type:id" to title.
    """
    titles = {}
    unique_refs = {}
    
    for ref_type, ref_id, _, _ in references:
        key = f"{ref_type}:{ref_id}"
        if key not in unique_refs:
            unique_refs[key] = (ref_type, ref_id)
    
    for key, (ref_type, ref_id) in unique_refs.items():
        try:
            full_id = f"{ref_type}:{ref_id}" if not ref_id.startswith(f"{ref_type}:") else ref_id
            title = ""
            
            if ref_type == "source":
                source = await Source.get(full_id)
                if source:
                    title = source.title or key
            
            if title:
                titles[key] = title
        except Exception:
            pass
    
    return titles


def process_references(
    text: str,
    reference_titles: Dict[str, str]
) -> Tuple[str, List[Dict[str, str]]]:
    """
    Process references in text and convert to numbered format.
    
    Returns:
        - processed_text: Text with references replaced by [1], [2], etc.
        - references: List of reference dicts with number, type, id, title
    """
    references = parse_references(text)
    
    if not references:
        return text, []
    
    reference_map = {}
    next_number = 1
    
    for ref_type, ref_id, _, _ in references:
        key = f"{ref_type}:{ref_id}"
        if key not in reference_map and key in reference_titles:
            reference_map[key] = {
                "number": next_number,
                "type": ref_type,
                "id": ref_id
            }
            next_number += 1
    
    processed_text = text
    
    for ref_type, ref_id, start_idx, end_idx in reversed(references):
        key = f"{ref_type}:{ref_id}"
        if key not in reference_map:
            processed_text = processed_text[:start_idx] + processed_text[end_idx:]
            continue
        
        ref_data = reference_map[key]
        number = ref_data["number"]
        
        context_before = processed_text[max(0, start_idx - 2):start_idx]
        context_after = processed_text[end_idx:min(len(processed_text), end_idx + 2)]
        
        replace_start = start_idx
        replace_end = end_idx
        
        if context_before == "[[" and context_after.startswith("]]"):
            replace_start = start_idx - 2
            replace_end = end_idx + 2
        elif context_before.endswith("[") and context_after.startswith("]"):
            replace_start = start_idx - 1
            replace_end = end_idx + 1
        
        citation_link = f"[{number}](#ref-{ref_type}-{ref_id})"
        processed_text = processed_text[:replace_start] + citation_link + processed_text[replace_end:]
    
    processed_text = re.sub(r'\[source:[a-zA-Z0-9_]+\]', '', processed_text)
    processed_text = re.sub(r'\[source:[a-zA-Z0-9_]+', '', processed_text)
    
    valid_numbers = {ref_data["number"] for ref_data in reference_map.values()}
    processed_text = re.sub(
        r'\[(\d+)\]\(#ref-[^)]+\)',
        lambda m: m.group(0) if int(m.group(1)) in valid_numbers else '',
        processed_text
    )
    
    processed_text = re.sub(r'\[(?![0-9,\s]+\]\(#ref-)', '', processed_text)
    processed_text = re.sub(r'([^\[])(\d+[,\s]*\d*)\]', r'\1[\2]', processed_text)
    processed_text = re.sub(r'^(\d+[,\s]*\d*)\]', r'[\1]', processed_text, flags=re.MULTILINE)
    processed_text = re.sub(r'(\s+)(\d+[,\s]*\d*)\]', r'\1[\2]', processed_text)
    processed_text = re.sub(r'(\[\d+\]\(#ref-[^)]+\)),\s*(\[\d+\]\(#ref-[^)]+\))\]', r'\1, \2', processed_text)
    processed_text = re.sub(r'(\[\d+,\s*\d+\]\(#ref-[^)]+\))\]', r'\1', processed_text)
    processed_text = re.sub(r'(\[\d+\]),\s*(\[\d+\])\]', r'\1, \2', processed_text)
    processed_text = re.sub(r'(\[\d+,\s*\d+\])\]', r'\1', processed_text)
    processed_text = re.sub(r'(\]\s*),\s*(\[\d+\]\(#ref-[^)]+\))\]', r'\1, \2', processed_text)
    processed_text = re.sub(r'(\[\d+\]\(#ref-[^)]+\))\s*\]', r'\1', processed_text)
    processed_text = re.sub(r'(\[\d+\]\(#ref-[^)]+\)),\s*(\[\d+\]\(#ref-[^)]+\))\s*\]', r'\1, \2', processed_text)
    processed_text = re.sub(r'\]\]', ']', processed_text)
    
    ref_list = []
    for key, ref_data in reference_map.items():
        title = reference_titles.get(key, key)
        if title and title != key:
            ref_list.append({
                "number": ref_data["number"],
                "type": ref_data["type"],
                "id": ref_data["id"],
                "title": title
            })
    
    ref_list.sort(key=lambda x: x["number"])
    
    return processed_text, ref_list

