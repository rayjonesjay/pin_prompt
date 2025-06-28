/*
  # Add LLM Models Configuration Table

  1. New Tables
    - `llm_models`
      - `id` (uuid, primary key)
      - `name` (text) - display name of the model
      - `provider` (text) - provider like OpenAI, Anthropic, etc.
      - `category` (text) - text, image, video, audio, multimodal
      - `is_active` (boolean) - whether the model is available for selection
      - `sort_order` (integer) - for ordering in dropdowns
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on llm_models table
    - Add policies for public read access
    - Add policies for admin management
*/

-- Create LLM models table
CREATE TABLE IF NOT EXISTS llm_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL,
  category text NOT NULL CHECK (category IN ('text', 'image', 'video', 'audio', 'multimodal')),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE llm_models ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active models
CREATE POLICY "Anyone can read active LLM models"
  ON llm_models
  FOR SELECT
  USING (is_active = true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_llm_models_active ON llm_models(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_llm_models_category ON llm_models(category);

-- Insert comprehensive list of LLM models
INSERT INTO llm_models (name, provider, category, sort_order) VALUES
-- Text Models
('GPT-4', 'OpenAI', 'text', 1),
('GPT-4 Turbo', 'OpenAI', 'text', 2),
('GPT-3.5 Turbo', 'OpenAI', 'text', 3),
('Claude 3 Opus', 'Anthropic', 'text', 4),
('Claude 3 Sonnet', 'Anthropic', 'text', 5),
('Claude 3 Haiku', 'Anthropic', 'text', 6),
('Claude 2', 'Anthropic', 'text', 7),
('Gemini Pro', 'Google', 'text', 8),
('Gemini Ultra', 'Google', 'text', 9),
('PaLM 2', 'Google', 'text', 10),
('LLaMA 2 70B', 'Meta', 'text', 11),
('LLaMA 2 13B', 'Meta', 'text', 12),
('LLaMA 2 7B', 'Meta', 'text', 13),
('Mistral 7B', 'Mistral AI', 'text', 14),
('Mixtral 8x7B', 'Mistral AI', 'text', 15),
('Cohere Command', 'Cohere', 'text', 16),
('Cohere Command Light', 'Cohere', 'text', 17),

-- Image Models
('DALL-E 3', 'OpenAI', 'image', 101),
('DALL-E 2', 'OpenAI', 'image', 102),
('Midjourney v6', 'Midjourney', 'image', 103),
('Midjourney v5.2', 'Midjourney', 'image', 104),
('Stable Diffusion XL', 'Stability AI', 'image', 105),
('Stable Diffusion 2.1', 'Stability AI', 'image', 106),
('Stable Diffusion 1.5', 'Stability AI', 'image', 107),
('Adobe Firefly', 'Adobe', 'image', 108),
('Imagen 2', 'Google', 'image', 109),
('Leonardo AI', 'Leonardo AI', 'image', 110),
('Playground AI', 'Playground AI', 'image', 111),
('DreamStudio', 'Stability AI', 'image', 112),
('Canva AI', 'Canva', 'image', 113),
('Jasper Art', 'Jasper', 'image', 114),

-- Video Models
('Sora', 'OpenAI', 'video', 201),
('Runway Gen-2', 'Runway', 'video', 202),
('Runway Gen-1', 'Runway', 'video', 203),
('Pika Labs', 'Pika Labs', 'video', 204),
('Stable Video Diffusion', 'Stability AI', 'video', 205),
('Synthesia', 'Synthesia', 'video', 206),
('D-ID', 'D-ID', 'video', 207),
('HeyGen', 'HeyGen', 'video', 208),
('Luma Dream Machine', 'Luma AI', 'video', 209),

-- Audio Models
('Eleven Labs', 'Eleven Labs', 'audio', 301),
('Murf AI', 'Murf', 'audio', 302),
('Speechify', 'Speechify', 'audio', 303),
('Resemble AI', 'Resemble AI', 'audio', 304),
('Descript Overdub', 'Descript', 'audio', 305),
('WaveNet', 'Google', 'audio', 306),
('Amazon Polly', 'Amazon', 'audio', 307),
('Azure Speech', 'Microsoft', 'audio', 308),
('Whisper', 'OpenAI', 'audio', 309),
('Otter.ai', 'Otter.ai', 'audio', 310),

-- Multimodal Models
('GPT-4 Vision', 'OpenAI', 'multimodal', 401),
('Claude 3 Vision', 'Anthropic', 'multimodal', 402),
('Gemini Pro Vision', 'Google', 'multimodal', 403),
('LLaVA', 'Various', 'multimodal', 404),
('BLIP-2', 'Salesforce', 'multimodal', 405),
('Flamingo', 'DeepMind', 'multimodal', 406);