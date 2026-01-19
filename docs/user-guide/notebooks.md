# Notebooks User Guide

Notebooks are the core organizational unit in Open Notebook, providing a structured way to collect, organize, and analyze research materials. Open Notebook uses a single notebook approach, automatically organizing all your content in one place.

## Table of Contents

1. [Understanding Notebooks](#understanding-notebooks)
2. [Notebook Organization Strategies](#notebook-organization-strategies)
3. [Notebook Features](#notebook-features)
4. [Best Practices for Notebook Organization](#best-practices-for-notebook-organization)

## Understanding Notebooks

### Single Notebook Architecture

Open Notebook uses a single notebook approach where all your sources, notes, and chat sessions are organized in one central workspace. This simplifies your workflow and ensures all your research materials are easily accessible.

### Accessing Your Notebook

1. **Access the Notebooks Page**: Navigate to **📒 Notebooks** in the sidebar
2. **Automatic Redirect**: The system automatically redirects you to your notebook if one exists
3. **View Notebook Information**: The notebook header displays:
   - **Update timestamp**: When the notebook was last modified
   - **Source count**: Number of sources in the notebook
   - **Note count**: Number of notes in the notebook
- **Archive status**: Visual distinction between active and archived notebooks

#### Editing Notebook Details

1. **Open the notebook** you want to edit
2. **Click on the description area** (or "click to add a description" if empty)
3. **Modify the details**:
   - Update the name in the text input field
   - Edit the description in the text area
   - Use the placeholder text as guidance for comprehensive descriptions
4. **Save changes** by clicking the "💾 Save" button

#### Archiving and Unarchiving

**To Archive a Notebook:**
1. Open the notebook
2. Expand the description section
3. Click "🗃️ Archive"
4. The notebook will be moved to the archived section

**To Unarchive a Notebook:**
1. Find the notebook in the "🗃️ Archived Notebooks" section
2. Open the notebook
3. Expand the description section
4. Click "🗃️ Unarchive"

**Important Notes:**
- Archived notebooks remain searchable and accessible
- Archived notebooks don't appear in the main notebook list
- You can still add sources, notes, and use all features in archived notebooks

#### Deleting Notebooks

**⚠️ Warning**: Notebook deletion is permanent and cannot be undone.

1. Open the notebook you want to delete
2. Expand the description section
3. Click "☠️ Delete forever"
4. Confirm the deletion

This will permanently remove:
- The notebook and all its metadata
- All sources associated with the notebook
- All notes and AI-generated insights
- All chat sessions and conversation history

## Notebook Organization Strategies

### Topic-Based Organization

Organize notebooks around specific research topics or projects:

**Examples:**
- `Climate Change Research`
- `Machine Learning Fundamentals`
- `Urban Planning Strategies`
- `Digital Marketing Trends 2024`

### Project-Based Organization

Organize your research by project or topic:

**Examples:**
- `Q1 Market Analysis Report`
- `PhD Literature Review - Chapter 2`
- `Product Launch Strategy - Widget X`
- `Client Proposal - ABC Corporation`

### Temporal Organization

Organize notebooks by time periods or phases:

**Examples:**
- `Weekly Research Notes - January 2024`
- `Conference Prep - Tech Summit 2024`
- `Quarterly Planning - Q2 2024`
- `Course Materials - Spring Semester`

### Hierarchical Organization

Use naming conventions to create logical hierarchies:

**Examples:**
- `01 - Project Alpha - Literature Review`
- `02 - Project Alpha - Data Analysis`
- `03 - Project Alpha - Final Report`

Or:
- `Marketing - SEO Research`
- `Marketing - Social Media Strategies`
- `Marketing - Content Calendar`

### Hybrid Organization

Combine multiple strategies for complex research needs:

**Examples:**
- `2024-Q1 - Climate Policy - Legislative Analysis`
- `PhD-Ch3 - Urban Planning - Case Studies`
- `Client-ABC - Market Research - Competitive Analysis`

## Switching Between Notebooks

### Quick Navigation

1. **From Any Notebook**: Click the "🔙 Back to the list" button in the notebook header
2. **From the Notebooks List**: Click "Open" on any notebook card
3. **Browser Navigation**: Use browser back/forward buttons (maintains session state)

### Session Management

Open Notebook maintains separate session states for each notebook:

- **Context Settings**: Each notebook remembers which sources are in context
- **Chat History**: Conversation threads are preserved per notebook
- **UI State**: Column layouts and interface preferences are maintained

### Workflow Optimization

**For Active Research:**
- Keep 2-3 primary notebooks open in different browser tabs
- Use the "🔄 Refresh" button to update content without losing session state
- Bookmark frequently accessed notebooks

**For Reference Work:**
- Use the archived notebooks section for completed projects
- Maintain a "Reference Materials" notebook for general resources
- Use tags or topics to organize sources by project type

## Notebook Settings and Configuration

### Notebook-Level Settings

Each notebook maintains its own configuration:

**Description Management:**
- Detailed purpose and scope definitions
- Research objectives and methodologies
- Target audience and expected outcomes
- Context for AI interactions

**Archive Status:**
- Active notebooks appear in the main list
- Archived notebooks are collapsed but remain accessible
- Archive status affects search and display but not functionality

### Default Content Settings

**Context Configuration:**
- Set default context levels for new sources
- Configure AI interaction preferences
- Establish source visibility standards

**Transformation Settings:**
- Default transformation prompts for the notebook
- Custom transformation patterns
- Model preferences for content processing

### Integration Settings

**Model Configuration:**
- Preferred language models for chat interactions
- Embedding models for search and context
- Speech-to-text preferences

**API Access:**
- Programmatic access to notebook content
- Integration with external tools and services
- Authentication and permission settings

## Sharing and Collaboration Features

### Current Sharing Capabilities

**Export Options:**
- Full notebook content export
- Individual source and note export
- Generated insights and transformations
- Chat conversation histories

**API Access:**
- RESTful API for programmatic access
- Authentication via API keys or password protection
- Full CRUD operations on notebooks and content

### Collaboration Workflows

**Team Research:**
1. **Shared Environment**: Deploy Open Notebook on shared infrastructure
2. **Notebook Conventions**: Establish naming and organization standards
3. **Content Guidelines**: Define source quality and annotation standards
4. **Review Processes**: Implement peer review for critical research

**Knowledge Sharing:**
- Export notebooks as comprehensive research packages
- Create shareable transformation outputs
- Maintain citation and reference standards

### Security and Privacy

**Access Control:**
- Password protection for public deployments
- API authentication for programmatic access
- Local deployment options for sensitive research

**Data Management:**
- Local storage with no external data sharing
- Configurable AI provider selection
- Full control over context and content sharing

## Import/Export Capabilities

### Supported Import Formats

**Direct Source Integration:**
- **Documents**: PDF, DOC/DOCX, TXT, Markdown, EPUB
- **Office Files**: Excel/PowerPoint (XLS/XLSX, PPT/PPTX)
- **Images**: JPG, PNG
- **Text Content**: Direct paste or manual entry

**Bulk Import Strategies:**
- Use standardized source organization patterns
- Use consistent naming conventions for imported materials
- Maintain metadata and source attribution
- Document import dates and processing notes

### Export Options

**Notebook Export:**
- Complete notebook structure with all sources and notes
- Chat conversation histories and AI interactions
- Transformation outputs and generated insights
- Metadata including creation dates and source information

**Content Export:**
- Individual source materials with annotations
- Generated notes and AI insights
- Search results and analysis summaries

**Integration Export:**
- API-accessible data structures
- JSON format for programmatic processing
- Structured data for external tool integration
- Citation and reference formatting

### Migration Strategies

**From Other Research Tools:**
1. **Export existing content** from current tools
2. **Prepare import materials** in supported formats
3. **Organize your notebook structure** matching your organizational needs
4. **Import content systematically** with proper categorization
5. **Verify content integrity** and fix any import issues

**Platform Migration:**
- Export complete notebooks before moving between instances
- Maintain consistent API configurations
- Preserve chat histories and AI interactions
- Document custom transformations and settings

## Best Practices for Notebook Organization

### Naming Conventions

**Consistent Patterns:**
- Use descriptive, searchable names
- Include date or version information when relevant
- Maintain consistent capitalization and formatting
- Avoid special characters that might cause issues

**Effective Examples:**
- `2024-Q1-Market-Research-SaaS-Tools`
- `PhD-Literature-Review-Urban-Planning`
- `Client-ABC-Competitive-Analysis-Phase-1`
- `Personal-Learning-Machine-Learning-Basics`

### Content Organization

**Source Management:**
- Add sources consistently as you find them
- Use descriptive titles that explain the source's relevance
- Include creation dates and source attribution
- Maintain a balance between comprehensive and focused content

**Note-Taking Strategy:**
- Create manual notes for personal insights and observations
- Save AI-generated insights that provide value
- Use consistent formatting for different types of notes
- Link related notes and sources when appropriate

### Maintenance Workflows

**Regular Review:**
- **Weekly**: Review active notebooks and update descriptions
- **Monthly**: Archive completed projects and clean up unused content
- **Quarterly**: Evaluate notebook organization and optimize structure
- **Annually**: Export important notebooks and review retention policies

**Quality Control:**
- Verify source accuracy and reliability
- Update notebook descriptions as research evolves
- Remove outdated or irrelevant content
- Maintain consistent citation and reference standards

### Performance Optimization

**Context Management:**
- Use minimum necessary context for AI interactions
- Set appropriate context levels for different source types
- Monitor API usage and costs
- Optimize embedding and search performance

**Storage Management:**
- Regular cleanup of temporary files and cached content
- Monitor database size and performance
- Archive old notebooks to improve system performance
- Maintain backup strategies for important research

### Advanced Workflows

**Research Methodology:**
1. **Planning Phase**: Set up your notebook with clear research objectives
2. **Collection Phase**: Systematically add sources with proper organization
3. **Analysis Phase**: Use transformations and AI interactions for insights
4. **Synthesis Phase**: Generate comprehensive notes and summaries
5. **Communication Phase**: Produce shareable content for stakeholders
6. **Archive Phase**: Preserve completed research for future reference

**Multi-Notebook Projects:**
- Use consistent naming conventions across related notebooks
- Maintain cross-references between related research
- Create summary notes that reference detailed research
- Develop template notebooks for recurring project types

---

## Conclusion

Effective notebook management in Open Notebook requires thoughtful organization, consistent practices, and strategic use of the platform's features. By following these guidelines and adapting them to your specific research needs, you can create a powerful knowledge management system that enhances your research capabilities and maintains long-term value.

Remember that Open Notebook is designed to be flexible and adaptable to your workflow. Experiment with different organizational strategies, naming conventions, and content management approaches to find what works best for your research style and objectives.

For additional support and advanced features, consult the [API documentation](http://localhost:5055/docs) and explore the [transformation system](../features/transformations.md) for custom content processing capabilities.