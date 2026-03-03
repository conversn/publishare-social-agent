
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPersonaFromCategory, getPersonaDisplayName } from '@/utils/personaMapping';
import TagManager from './TagManager';
import MarkdownEditor from '@/components/MarkdownEditor/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownEditor/MarkdownPreview';

interface ArticleFormFieldsProps {
  title: string;
  setTitle: (value: string) => void;
  excerpt: string;
  setExcerpt: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  categories: string[];
  persona?: string;
  setPersona?: (value: string) => void;
  tags?: string[];
  setTags?: (value: string[]) => void;
  markdown_body: string;
  setMarkdownBody: (value: string) => void;
}

const ArticleFormFields: React.FC<ArticleFormFieldsProps> = ({
  title,
  setTitle,
  excerpt,
  setExcerpt,
  category,
  setCategory,
  categories,
  persona,
  setPersona,
  tags = [],
  setTags = () => {},
  markdown_body,
  setMarkdownBody
}) => {
  const handleCategoryChange = (selectedCategory: string) => {
    setCategory(selectedCategory);
    if (setPersona && selectedCategory) {
      const suggestedPersona = getPersonaFromCategory(selectedCategory);
      if (suggestedPersona) {
        setPersona(suggestedPersona);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2 text-forest-700">Title *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter article title"
          className="bg-ivory border-sand-300 focus:border-forest-500 focus:ring-forest-500/20 text-forest-800"
        />
      </div>
      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium mb-2 text-forest-700">Excerpt *</label>
        <Input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief description of the article"
          className="bg-ivory border-sand-300 focus:border-forest-500 focus:ring-forest-500/20 text-forest-800"
        />
      </div>
      {/* Category and Persona - Above Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-forest-700">Category *</label>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="bg-ivory border-sand-300 focus:border-forest-500 focus:ring-forest-500/20 text-forest-800">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-ivory border-sand-300 shadow-lg z-50">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800 data-[state=checked]:text-forest-800">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-forest-700">Persona</label>
          <Select value={persona || ''} onValueChange={setPersona || (() => {})}>
            <SelectTrigger className="bg-ivory border-sand-300 focus:border-forest-500 focus:ring-forest-500/20 text-forest-800">
              <SelectValue placeholder="Auto-selected based on category" />
            </SelectTrigger>
            <SelectContent className="bg-ivory border-sand-300 shadow-lg z-50">
              <SelectItem value="retirement_planner" className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800">
                {getPersonaDisplayName('retirement_planner')}
              </SelectItem>
              <SelectItem value="medicare_specialist" className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800">
                {getPersonaDisplayName('medicare_specialist')}
              </SelectItem>
              <SelectItem value="estate_planner" className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800">
                {getPersonaDisplayName('estate_planner')}
              </SelectItem>
              <SelectItem value="housing_specialist" className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800">
                {getPersonaDisplayName('housing_specialist')}
              </SelectItem>
              <SelectItem value="insurance_specialist" className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800">
                {getPersonaDisplayName('insurance_specialist')}
              </SelectItem>
              <SelectItem value="tax_strategist" className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800">
                {getPersonaDisplayName('tax_strategist')}
              </SelectItem>
              <SelectItem value="annuity_expert" className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800">
                {getPersonaDisplayName('annuity_expert')}
              </SelectItem>
              <SelectItem value="financial_coach" className="hover:bg-sand-100 focus:bg-sand-100 text-forest-800">
                {getPersonaDisplayName('financial_coach')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Markdown Editor and Preview */}
      <div>
        <label className="block text-sm font-medium mb-2 text-forest-700">Content (Markdown)</label>
        <MarkdownEditor value={markdown_body} onChange={setMarkdownBody} />
        <div className="mt-4">
          <label className="block text-xs font-medium mb-1 text-forest-600">Live Preview</label>
          <MarkdownPreview markdown={markdown_body} />
        </div>
      </div>
      {/* Tags - Below Content */}
      <div>
        <label className="block text-sm font-medium mb-2 text-forest-700">Tags</label>
        <TagManager
          tags={tags}
          onTagsChange={setTags}
          category={category}
          title={title}
          content={markdown_body}
        />
      </div>
    </div>
  );
};

export default ArticleFormFields;
