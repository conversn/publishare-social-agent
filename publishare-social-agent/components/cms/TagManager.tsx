import React, { useState, useEffect } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface TagManagerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  category?: string;
  title?: string;
  content?: string;
}

export default function TagManager({ tags, onTagsChange, category, title, content }: TagManagerProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchAllTags();
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      filterSuggestions(inputValue);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, allTags]);

  async function fetchAllTags() {
    try {
      const { data, error } = await supabase.rpc('get_all_tags');
      if (error) throw error;
      setAllTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }

  async function getSuggestedTags() {
    if (!title || !category) return [];
    
    try {
      const { data, error } = await supabase.rpc('suggest_tags_for_article', {
        article_title: title,
        article_content: content || '',
        article_category: category
      });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting tag suggestions:', error);
      return [];
    }
  }

  function filterSuggestions(input: string) {
    const filtered = allTags
      .map(item => item.tag)
      .filter(tag => 
        tag.toLowerCase().includes(input.toLowerCase()) &&
        !tags.includes(tag)
      )
      .slice(0, 10);
    setSuggestions(filtered);
  }

  function addTag(tag: string) {
    const cleanTag = tag.trim().toLowerCase();
    if (cleanTag && !tags.includes(cleanTag)) {
      onTagsChange([...tags, cleanTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  }

  function removeTag(tagToRemove: string) {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  }

  async function handleSuggestTags() {
    const suggested = await getSuggestedTags();
    const newTags = suggested.filter(tag => !tags.includes(tag));
    if (newTags.length > 0) {
      onTagsChange([...tags, ...newTags.slice(0, 5)]); // Limit to 5 new tags
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Tags
        </label>
        <button
          type="button"
          onClick={handleSuggestTags}
          className="flex items-center text-xs text-blue-600 hover:text-blue-800"
        >
          <Tag className="w-3 h-3 mr-1" />
          Suggest Tags
        </button>
      </div>
      
      {/* Tag Input */}
      <div className="relative">
        <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={tags.length === 0 ? "Add tags..." : ""}
            className="flex-1 min-w-0 border-none outline-none text-sm bg-transparent"
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Tags */}
      {allTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Popular tags:</p>
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 10).map((tagItem, index) => (
              <button
                key={index}
                type="button"
                onClick={() => addTag(tagItem.tag)}
                disabled={tags.includes(tagItem.tag)}
                className={`px-2 py-1 text-xs rounded-full border ${
                  tags.includes(tagItem.tag)
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {tagItem.tag} ({tagItem.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tag Count */}
      <p className="text-xs text-gray-500">
        {tags.length} tag{tags.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
} 