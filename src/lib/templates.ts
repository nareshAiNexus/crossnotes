import { FileText, Calendar, Code, Briefcase, ListTodo, BookOpen, Lightbulb, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: string;
  content: string;
  defaultTitle: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Start with an empty note',
    icon: FileText,
    category: 'Basic',
    defaultTitle: 'Untitled',
    content: '',
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured template for meeting documentation',
    icon: Users,
    category: 'Work',
    defaultTitle: 'Meeting Notes - {{date}}',
    content: `# Meeting Notes

## 📅 Meeting Details
- **Date:** {{date}}
- **Time:** 
- **Attendees:** 
- **Location/Link:** 

## 🎯 Agenda
1. 
2. 
3. 

## 📝 Discussion Points

### Topic 1
- 

### Topic 2
- 

## ✅ Action Items
- [ ] **[Person]** - Task description - Due: 
- [ ] **[Person]** - Task description - Due: 

## 🔑 Key Decisions
- 

## 📌 Next Steps
- 

## 📎 Additional Notes
`,
  },
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    description: 'Reflect on your day with this journal template',
    icon: Calendar,
    category: 'Personal',
    defaultTitle: 'Journal - {{date}}',
    content: `# Daily Journal - {{date}}

## 🌅 Morning
**How I'm feeling:** 

**Today's intentions:**
- 
- 
- 

## 📊 Daily Log

### 🎯 What I accomplished
- 

### 💡 What I learned
- 

### 🚧 Challenges faced
- 

### 🌟 Wins & Highlights
- 

## 🌙 Evening Reflection

**Gratitude:**
1. 
2. 
3. 

**What could have been better:**
- 

**Tomorrow's priorities:**
1. 
2. 
3. 

## 💭 Random Thoughts
`,
  },
  {
    id: 'code-snippet',
    name: 'Code Snippet',
    description: 'Document and organize code snippets',
    icon: Code,
    category: 'Development',
    defaultTitle: 'Code Snippet - {{date}}',
    content: `# Code Snippet

## 📌 Overview
**Purpose:** 
**Language:** 
**Tags:** #code #snippet

## 💻 Code

\`\`\`javascript
// Your code here

\`\`\`

## 📖 Explanation


## 🔧 Usage Example

\`\`\`javascript
// Example usage

\`\`\`

## ⚙️ Configuration


## 📚 References
- [Documentation]()
- [Related Article]()

## 📝 Notes
`,
  },
  {
    id: 'project-planning',
    name: 'Project Planning',
    description: 'Plan and track project details',
    icon: Briefcase,
    category: 'Work',
    defaultTitle: 'Project Plan - {{date}}',
    content: `# Project Planning

## 🎯 Project Overview
**Project Name:** 
**Start Date:** {{date}}
**Target Completion:** 
**Status:** 🟡 Planning

## 📋 Objectives
- 
- 
- 

## 👥 Team & Stakeholders
- **Project Lead:** 
- **Team Members:** 
- **Stakeholders:** 

## 📊 Scope

### In Scope
- 

### Out of Scope
- 

## 🗓️ Timeline & Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Phase 1   |             | ⬜     |
| Phase 2   |             | ⬜     |
| Phase 3   |             | ⬜     |

## 📦 Deliverables
1. 
2. 
3. 

## 🎯 Success Criteria
- 
- 
- 

## ⚠️ Risks & Mitigation
- **Risk:** 
  - **Impact:** 
  - **Mitigation:** 

## 💰 Budget & Resources


## 📝 Additional Notes
`,
  },
  {
    id: 'todo-list',
    name: 'To-Do List',
    description: 'Organize tasks and priorities',
    icon: ListTodo,
    category: 'Productivity',
    defaultTitle: 'To-Do - {{date}}',
    content: `# To-Do List

## 📅 {{date}}

## 🔴 High Priority
- [ ] 
- [ ] 
- [ ] 

## 🟡 Medium Priority
- [ ] 
- [ ] 
- [ ] 

## 🟢 Low Priority
- [ ] 
- [ ] 
- [ ] 

## ✅ Completed
- [x] 

## 📌 Notes
`,
  },
  {
    id: 'reading-notes',
    name: 'Reading Notes',
    description: 'Summarize and reflect on books/articles',
    icon: BookOpen,
    category: 'Learning',
    defaultTitle: 'Reading Notes - {{date}}',
    content: `# Reading Notes

## 📚 Source Information
- **Title:** 
- **Author:** 
- **Type:** Book / Article / Paper
- **Date Started:** {{date}}
- **Date Finished:** 

## 🎯 Why I'm Reading This


## 📝 Key Points & Highlights

### Chapter/Section 1
- 

### Chapter/Section 2
- 

## 💡 Key Insights


## 🤔 Questions & Thoughts


## 📌 Actionable Takeaways
1. 
2. 
3. 

## ⭐ Rating & Recommendation
**Rating:** ⭐⭐⭐⭐⭐ (out of 5)

**Would I recommend it?** 

**Who would benefit from this?** 

## 🔗 Related Resources
- 
`,
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Capture ideas and creative thinking',
    icon: Lightbulb,
    category: 'Creativity',
    defaultTitle: 'Brainstorm - {{date}}',
    content: `# Brainstorming Session

## 💡 Topic
**What are we brainstorming?** 

**Goal:** 

## 🧠 Initial Thoughts


## 💭 Ideas

### Idea 1
**Description:** 

**Pros:**
- 

**Cons:**
- 

**Next Steps:**
- 

---

### Idea 2
**Description:** 

**Pros:**
- 

**Cons:**
- 

**Next Steps:**
- 

---

### Idea 3
**Description:** 

**Pros:**
- 

**Cons:**
- 

**Next Steps:**
- 

## ⭐ Top Ideas
1. 
2. 
3. 

## 🎯 Action Plan


## 📝 Additional Notes
`,
  },
];

export function getTemplateById(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((template) => template.id === id);
}

export function formatTemplateContent(content: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return content.replace(/\{\{date\}\}/g, dateStr);
}

export function formatTemplateTitle(title: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return title.replace(/\{\{date\}\}/g, dateStr);
}
