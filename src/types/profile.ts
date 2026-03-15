export interface Profile {
  id: string;
  name: string;
  age?: number;
  location?: string;
  image: string;
  interests: string[];
  role?: string;
  aboutMe?: string;
  githubProfileUrl?: string;
  goal?: string;
}
