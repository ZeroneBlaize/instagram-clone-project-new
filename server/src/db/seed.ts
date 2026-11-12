import bcrypt from 'bcryptjs';
import { DataRepository } from './repository.js';

export async function seedDatabaseIfEmpty(repo: DataRepository): Promise<void> {
  if ((await repo.countUsers()) > 0) return;

  const passwordHash = await bcrypt.hash('DemoPass2026!', 10);
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
  const hoursAhead = (h: number) => new Date(now + h * 3600 * 1000).toISOString();

  await repo.createUser({
    id: 'usr_alex',
    username: 'alex_rivera',
    displayName: 'Alex Rivera',
    email: 'alex@framenew.example',
    passwordHash,
    avatarUrl: '/media/avatars/alex.svg',
    bio: 'Architectural photographer & visual systems builder. Sharing light, geometry, and city studies.',
    website: 'https://framenew.example/alex',
    verified: true,
    followers: ['usr_maya', 'usr_kenji', 'usr_sofia', 'usr_devon'],
    following: ['usr_maya', 'usr_kenji', 'usr_sofia'],
    savedPostIds: ['pst_lanterns', 'pst_alpine'],
    createdAt: hoursAgo(400),
  });

  await repo.createUser({
    id: 'usr_maya',
    username: 'maya_chen',
    displayName: 'Maya Chen',
    email: 'maya@framenew.example',
    passwordHash,
    avatarUrl: '/media/avatars/maya.svg',
    bio: 'Specialty coffee brewer, studio ceramicist & analog colorist.',
    website: 'https://framenew.example/maya',
    verified: true,
    followers: ['usr_alex', 'usr_kenji', 'usr_priya'],
    following: ['usr_alex', 'usr_sofia'],
    savedPostIds: ['pst_arches'],
    createdAt: hoursAgo(380),
  });

  await repo.createUser({
    id: 'usr_kenji',
    username: 'kenji_tanaka',
    displayName: 'Kenji Tanaka',
    email: 'kenji@framenew.example',
    passwordHash,
    avatarUrl: '/media/avatars/kenji.svg',
    bio: 'Night street photography & rainy reflections across Kyoto.',
    website: '',
    verified: false,
    followers: ['usr_alex', 'usr_maya'],
    following: ['usr_alex', 'usr_devon'],
    savedPostIds: [],
    createdAt: hoursAgo(340),
  });

  await repo.createUser({
    id: 'usr_sofia',
    username: 'sofia_lopez',
    displayName: 'Sofia Lopez',
    email: 'sofia@framenew.example',
    passwordHash,
    avatarUrl: '/media/avatars/sofia.svg',
    bio: 'Alpine trail runner & environmental field recordist.',
    website: '',
    verified: true,
    followers: ['usr_alex', 'usr_maya', 'usr_priya'],
    following: ['usr_alex', 'usr_kenji'],
    savedPostIds: [],
    createdAt: hoursAgo(300),
  });

  await repo.createUser({
    id: 'usr_devon',
    username: 'devon_k',
    displayName: 'Devon Kim',
    email: 'devon@framenew.example',
    passwordHash,
    avatarUrl: '/media/avatars/devon.svg',
    bio: 'Creative technologist building open-source motion tools and generative shaders.',
    website: '',
    verified: false,
    followers: ['usr_kenji'],
    following: ['usr_alex'],
    savedPostIds: [],
    createdAt: hoursAgo(260),
  });

  await repo.createUser({
    id: 'usr_priya',
    username: 'priya_nair',
    displayName: 'Priya Nair',
    email: 'priya@framenew.example',
    passwordHash,
    avatarUrl: '/media/avatars/priya.svg',
    bio: 'Design researcher & editorial art director.',
    website: '',
    verified: false,
    followers: ['usr_maya'],
    following: ['usr_maya', 'usr_sofia'],
    savedPostIds: [],
    createdAt: hoursAgo(220),
  });

  await repo.createPost({
    id: 'pst_arches',
    userId: 'usr_alex',
    mediaUrl: '/media/arches.jpg',
    mediaKind: 'photo',
    caption: 'Golden hour shadows slicing through raw brutalist concrete arches. #architecture #minimalism #goldenhour',
    altText: 'Warm golden hour sunlight casting sharp diagonal shadows across concrete arches.',
    location: 'Osaka Cultural Pavilion',
    tags: ['architecture', 'minimalism', 'goldenhour'],
    likes: ['usr_maya', 'usr_kenji', 'usr_sofia', 'usr_devon'],
    contentWarning: null,
    guardrailStatus: 'clean',
    createdAt: hoursAgo(12),
  });

  await repo.createPost({
    id: 'pst_coffee',
    userId: 'usr_maya',
    mediaUrl: '/media/coffee.jpg',
    mediaKind: 'photo',
    caption: 'Slow ceramic V60 bloom before studio hours open. #coffee #morningritual #minimalism',
    altText: 'Ceramic pour-over coffee dripper over a glass carafe on walnut wood with soft morning light.',
    location: 'Atelier Roastery',
    tags: ['coffee', 'morningritual', 'minimalism'],
    likes: ['usr_alex', 'usr_sofia', 'usr_priya'],
    contentWarning: null,
    guardrailStatus: 'clean',
    createdAt: hoursAgo(9),
  });

  await repo.createPost({
    id: 'pst_lanterns',
    userId: 'usr_kenji',
    mediaUrl: '/media/lanterns.jpg',
    mediaKind: 'reel',
    caption: 'Rain-slicked cobblestones after dusk — amber lantern reflections in motion. #streetphoto #nightwalk #reels',
    altText: 'Quiet rainy stone alley at twilight glowing with warm amber paper lanterns.',
    location: 'Gion Backstreet',
    tags: ['streetphoto', 'nightwalk', 'reels'],
    likes: ['usr_alex', 'usr_maya', 'usr_devon'],
    contentWarning: null,
    guardrailStatus: 'clean',
    createdAt: hoursAgo(6),
  });

  await repo.createPost({
    id: 'pst_alpine',
    userId: 'usr_sofia',
    mediaUrl: '/media/alpine.jpg',
    mediaKind: 'photo',
    caption: 'First light climbing above the misty blue ridge line. Worth the 4 AM trailhead start. #alpine #landscape #outdoors',
    altText: 'Layered misty blue-green alpine mountain ridges at dawn under soft clouds.',
    location: 'Dolomite Ridge Trail',
    tags: ['alpine', 'landscape', 'outdoors'],
    likes: ['usr_alex', 'usr_maya', 'usr_priya'],
    contentWarning: null,
    guardrailStatus: 'clean',
    createdAt: hoursAgo(4),
  });

  await repo.createPost({
    id: 'pst_prism',
    userId: 'usr_devon',
    mediaUrl: '/media/studio-prism.svg',
    mediaKind: 'reel',
    caption: 'Procedural light refraction study rendered at 60fps in the browser. #generative #design #reels',
    altText: 'Geometric glowing prism triangle suspended inside a deep indigo and rose radial light field.',
    location: 'Shader Lab',
    tags: ['generative', 'design', 'reels'],
    likes: ['usr_alex', 'usr_kenji'],
    contentWarning: null,
    guardrailStatus: 'clean',
    createdAt: hoursAgo(2),
  });

  await repo.addComment({
    id: 'cmt_1',
    postId: 'pst_arches',
    userId: 'usr_maya',
    text: 'The contrast along that inner arch curve is unreal.',
    createdAt: hoursAgo(10),
  });
  await repo.addComment({
    id: 'cmt_2',
    postId: 'pst_lanterns',
    userId: 'usr_alex',
    text: 'Wet stone reflections always make amber light pop.',
    createdAt: hoursAgo(5),
  });
  await repo.addComment({
    id: 'cmt_3',
    postId: 'pst_coffee',
    userId: 'usr_priya',
    text: 'Need that ceramic dripper glaze recipe!',
    createdAt: hoursAgo(7),
  });

  await repo.createStory({
    id: 'sty_1',
    userId: 'usr_alex',
    mediaUrl: '/media/arches.jpg',
    caption: 'Morning architectural walk — concrete + warm sun.',
    viewedBy: [],
    createdAt: hoursAgo(5),
    expiresAt: hoursAhead(19),
  });
  await repo.createStory({
    id: 'sty_2',
    userId: 'usr_maya',
    mediaUrl: '/media/coffee.jpg',
    caption: 'Dialing in washed Ethiopian single origin.',
    viewedBy: [],
    createdAt: hoursAgo(4),
    expiresAt: hoursAhead(20),
  });
  await repo.createStory({
    id: 'sty_3',
    userId: 'usr_kenji',
    mediaUrl: '/media/lanterns.jpg',
    caption: 'Rain check in Kyoto tonight.',
    viewedBy: [],
    createdAt: hoursAgo(3),
    expiresAt: hoursAhead(21),
  });
  await repo.createStory({
    id: 'sty_4',
    userId: 'usr_sofia',
    mediaUrl: '/media/alpine.jpg',
    caption: 'Ridge traverse at 2,400m.',
    viewedBy: [],
    createdAt: hoursAgo(2),
    expiresAt: hoursAhead(22),
  });

  await repo.createMessage({
    id: 'msg_1',
    senderId: 'usr_maya',
    recipientId: 'usr_alex',
    text: 'Hey Alex! Are you bringing the 35mm lens to the studio shoot tomorrow?',
    read: false,
    createdAt: hoursAgo(3),
  });
  await repo.createMessage({
    id: 'msg_2',
    senderId: 'usr_kenji',
    recipientId: 'usr_alex',
    text: 'Loved the concrete arches set — let us swap color grading LUT notes soon.',
    read: true,
    createdAt: hoursAgo(8),
  });

  await repo.createNotification({
    id: 'ntf_1',
    userId: 'usr_alex',
    actorId: 'usr_maya',
    type: 'comment',
    postId: 'pst_arches',
    message: 'commented: "The contrast along that inner arch curve is unreal."',
    read: false,
    createdAt: hoursAgo(10),
  });
  await repo.createNotification({
    id: 'ntf_2',
    userId: 'usr_alex',
    actorId: 'usr_sofia',
    type: 'like',
    postId: 'pst_arches',
    message: 'liked your post at Osaka Cultural Pavilion',
    read: false,
    createdAt: hoursAgo(8),
  });
  await repo.createNotification({
    id: 'ntf_3',
    userId: 'usr_alex',
    actorId: 'usr_devon',
    type: 'follow',
    postId: null,
    message: 'started following you',
    read: true,
    createdAt: hoursAgo(24),
  });
}
