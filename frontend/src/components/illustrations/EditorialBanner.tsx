import React from 'react';

const stories = {
  architecture: { image: 'architecture-garden', eyebrow: 'A NEW PERSPECTIVE', title: 'See how it all connects.', text: 'Every component is part of a bigger picture. Explore yours.', alt: 'Original isometric illustration of connected architectural blocks in ivory and sage' },
  learning: { image: 'learning-path', eyebrow: 'PROGRESS THROUGH PRACTICE', title: 'Small fixes. Lasting instincts.', text: 'A little exploration, a thoughtful repair, a skill you can use again.', alt: 'Original illustration of a winding learning path linking code, verification, and a new challenge' },
  repository: { image: 'repository-studio', eyebrow: 'START WITH YOUR CODE', title: 'Bring something worth understanding.', text: 'Your next learning opportunity is already in your repository.', alt: 'Original illustration of an open repository folder with a floating code document' },
};

export const EditorialBanner: React.FC<{ kind: keyof typeof stories }> = ({ kind }) => {
  const story = stories[kind];
  return <section className="editorial-banner" aria-label={story.title}>
    <div className="editorial-banner-copy"><p>{story.eyebrow}</p><h2>{story.title}</h2><span>{story.text}</span></div>
    <img src={`/illustrations/${story.image}.svg`} alt={story.alt} width="720" height="360" decoding="async" />
  </section>;
};
