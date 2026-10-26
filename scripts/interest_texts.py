"""Interest categories: Travel, Daily Life, Jobs, Science, Tech, Food, People, Legends.
Grammar kept to to be, present simple, past simple and future simple (will).
Level 1 beginner, 2 elementary, 3 intermediate. Writes migrations/0015_interest_texts.sql."""
import sys

# (category, level, title, body)
TEXTS = [
# ---- Travel -------------------------------------------------------------
("Travel", 1, "Welcome to Our Guesthouse", """My family has a small guesthouse in Ha Giang.
We have five rooms. Each room has a bed, a fan, and a window with a mountain view.
Many tourists come here. They come from France, Germany, Australia, and many other countries.
I help my parents. I carry bags and show the rooms.
In the evening, my mother cooks dinner for the guests.
After dinner, the guests ask me questions about our village.
I answer in English. Every day, my English gets better.
Tomorrow, two guests from Canada will arrive."""),

("Travel", 1, "Excuse Me, Where Is the Market?", """A tourist stops a girl on the street.
"Excuse me, where is the market?"
"It is near here. Go straight for two hundred meters."
"Straight. OK."
"Then turn left at the school. The market is next to the post office."
"Turn left at the school, next to the post office. Thank you!"
"You are welcome. The market is very busy on Sunday. Have a nice day!"
The tourist smiles and walks to the market."""),

("Travel", 2, "The Ha Giang Loop", """Ha Giang is the most northern province of Vietnam.
Every year, thousands of travelers come here for the Ha Giang Loop.
The loop is a road trip of about 350 kilometers through the mountains.
Most travelers go by motorbike. Some ride alone, and some go with a local driver.
The trip usually takes three or four days.
On the way, travelers see rice terraces, small villages, and markets of the Hmong, Dao, and Tay people.
The most famous part is the Ma Pi Leng Pass. Far below the road, the green Nho Que River runs through a deep canyon.
The Dong Van Karst Plateau is also on the loop. In 2010, it became a UNESCO Global Geopark.
Many travelers also visit the Lung Cu Flag Tower, near the most northern point of Vietnam.
The roads are beautiful, but they are also steep and narrow. Good drivers ride slowly and carefully."""),

("Travel", 2, "Anna's First Trip to Vietnam", """Anna is from Germany. Last year, she visited Vietnam for the first time.
She arrived in Hanoi in October. The city was loud and busy, with thousands of motorbikes.
At first, she was afraid to cross the street. Then a local woman helped her.
"Walk slowly and do not stop," the woman said. Anna tried, and it worked!
After three days in Hanoi, Anna took a night bus to Ha Giang.
She stayed with a Hmong family in a small village.
She ate corn cakes, helped in the field, and learned a few words in Hmong.
The family did not speak much English, but they smiled and laughed a lot.
"It was the best part of my trip," Anna said.
Next year, she will come back with her sister."""),

("Travel", 3, "Good Tourists, Good Tourism", """Tourism brings money and jobs to many places, but it can also cause problems.
When too many visitors come, villages become crowded, and there is more trash on the roads.
Some tourists take photos of local people without asking. Others fly drones over homes or wear beach clothes in temples.
So what makes a good tourist?
First, a good tourist shows respect. They learn a few words of the local language, ask before they take photos, and follow local customs.
Second, a good tourist protects nature. They take their trash with them and stay on the paths.
Third, a good tourist helps the local economy. They sleep in family guesthouses, eat in small local restaurants, and buy crafts directly from the people who make them.
In this way, the money stays in the community.
Local people play a role too. They can share their culture with pride and tell visitors about their rules.
When tourists and local people respect each other, tourism becomes good for everyone."""),

# ---- Daily Life ---------------------------------------------------------
("Daily Life", 1, "At the Market", """"Good morning! How much are these oranges?"
"Thirty thousand dong a kilo."
"OK. Two kilos, please."
"Here you are. Anything else?"
"Yes. Do you have bananas?"
"Yes, we do. Ten thousand dong for a bunch."
"One bunch, please. How much is that?"
"Seventy thousand dong, please."
"Here you are. Thank you!"
"Thank you. See you next time!" """),

("Daily Life", 1, "At the Doctor", """Lan is sick. She has a headache and a fever.
Her mother takes her to the doctor.
"What is the matter?" the doctor asks.
"I have a headache, and I feel hot," Lan says.
The doctor checks her temperature. It is 38.5 degrees.
"You have a cold," the doctor says. "Drink a lot of water and stay in bed for two days."
He gives her some medicine.
"Take one pill after each meal."
Two days later, Lan feels much better. She goes back to school."""),

("Daily Life", 2, "A Phone Call", """Minh calls his friend Long.
"Hello, Long? It's Minh."
"Hi, Minh! How are you?"
"I'm fine, thanks. Are you free on Saturday?"
"Saturday morning? No, I help my father on the farm. But I'm free in the afternoon."
"Great! There is a football match at school at three o'clock. Do you want to come?"
"Sure! Who will play?"
"Our class and Class 9B. They won last year, but this year we will win!"
"Ha ha, OK. Where will we meet?"
"Let's meet at the school gate at half past two."
"OK. See you on Saturday!"
"See you!" """),

("Daily Life", 2, "Taking the Bus to Hanoi", """Last month, Hoa traveled to Hanoi to visit her aunt.
She bought a ticket at the bus station the day before. It cost 250,000 dong.
The bus left Ha Giang at eight o'clock in the evening.
It was a sleeper bus. Every passenger had a small bed.
Before the trip, the driver asked everyone to take off their shoes and put them in a plastic bag.
Hoa slept for most of the trip. The bus stopped twice, so people could use the toilet and buy snacks.
At five o'clock in the morning, the bus arrived at My Dinh Bus Station in Hanoi.
Hoa's aunt waited for her there with two cups of hot soy milk.
"Welcome to Hanoi!" she said."""),

("Daily Life", 3, "Smart With Money", """Many young people get their first money from a part-time job or as a gift at Tết.
What do they do with it? Some spend it all in one week. Others save every dong.
Experts say the best way is in the middle: make a simple plan.
A popular plan has three parts.
The first part is for needs: food, transport, school things, and the phone bill.
The second part is for wants: new clothes, games, or a coffee with friends.
The third part is for savings. Even a small amount, like ten percent, grows over time.
It also helps to write down what you spend for one month. Most people are surprised when they see the numbers.
Before you buy something, wait one day and ask yourself, "Do I really need this?"
Often, the answer is no.
If you save regularly, you will have money when you really need it, for example for an emergency, a course, or your own small business one day."""),

# ---- Jobs ---------------------------------------------------------------
("Jobs", 1, "Jobs in My Village", """Many people in my village are farmers.
They grow rice, corn, and vegetables, and they keep pigs and chickens.
My uncle is a mechanic. He fixes motorbikes in a small shop.
Mrs. Thu is a teacher. She teaches at the primary school.
Mr. Sang is a driver. He drives a bus to the city every day.
My cousin Linh is a tour guide. She speaks English and takes tourists to the mountains.
My father says every job is important.
What job will I do? I am not sure yet."""),

("Jobs", 2, "A Day in the Life of a Tour Guide", """Linh is 24 years old. She is a tour guide in Ha Giang.
Her day starts early. She gets up at half past five and checks her phone for messages from guests.
At seven o'clock, she meets the group at the hotel. Today there are six people from Australia and England.
First, she explains the plan for the day. Then the group rides to a local market.
At the market, Linh explains the clothes and food of the Hmong and Dao people.
She also helps the tourists buy things and teaches them to say "thank you" in Hmong.
At lunch, she answers many questions about life in Vietnam.
In the afternoon, they visit a village and a beautiful viewpoint.
In the evening, Linh is tired but happy.
"I love my job," she says. "Every day, I meet new people and share my home with them."
Linh learned English at school and practiced it every day with tourists."""),

("Jobs", 2, "How to Get a Job", """Do you want to get a good job one day? Here are some tips.
First, write a CV. A CV is a short document about you. It shows your name, your education, your skills, and your experience.
Keep it short and clear: one page is enough.
Second, find job offers. Look online, ask your teachers, and talk to friends and family.
Third, prepare for the interview. Think about common questions, for example:
"Tell me about yourself." "Why do you want this job?" "What are your strengths?"
Practice your answers with a friend.
On the day of the interview, wear clean clothes and arrive ten minutes early.
Smile, look at the interviewer, and listen carefully.
At the end, say thank you.
If you don't get the job, don't give up. Every interview is good practice for the next one."""),

("Jobs", 2, "From Old Tea Trees to a Small Business", """This is a story about a young woman. Let's call her Mai.
Mai grew up in a village high in the mountains of Ha Giang.
Near her village, there are very old tea trees. Some of them are hundreds of years old.
People call this tea Shan Tuyết, or "snow tea", because the young leaves have tiny white hairs.
For many years, Mai's family sold their tea leaves to traders for a very low price.
After high school, Mai learned about online selling.
She took good photos of the tea and of the old trees, and she wrote the story of her village.
She opened a small online shop. She wrote the product descriptions in Vietnamese and in English.
At first, she sold only a few packets. But slowly, more customers found her shop.
Today, she buys tea from ten families in her village, and they get a fair price.
"Our tea is special," Mai says. "We only needed to tell its story." """),

("Jobs", 3, "Studying Abroad", """Every year, thousands of young Vietnamese go abroad to study.
Popular countries include Japan, South Korea, Australia, the United States, and countries in Europe.
Why do they go? Some want a good university degree. Others want to learn a new language and see the world.
Studying abroad has many advantages. Students become more independent, they meet people from many cultures, and they often find better jobs later.
But it is not easy. Many students feel homesick in the first months. They miss their families and Vietnamese food.
Life abroad is also expensive, so many students work part-time.
Language is often the biggest challenge. Even students with good English find lectures difficult at first.
How can you prepare? Start learning the language early, and read a lot.
Look for scholarships. Many universities and governments offer them to students from Vietnam.
Talk to people who studied abroad. They can give you honest advice.
Finally, remember that studying abroad is not the only way to succeed. Many people build great careers at home."""),

# ---- Science ------------------------------------------------------------
("Science", 1, "The Sun and the Moon", """The sun is a star. It is very big and very hot.
It gives us light and heat. Plants need the sun to grow.
The Earth goes around the sun. One trip takes one year.
The moon goes around the Earth. One trip takes about one month.
The moon has no light of its own. It reflects the light of the sun.
Sometimes the moon is round and full. Sometimes it is thin, like a banana.
In 1969, people walked on the moon for the first time.
Maybe one day, you will go there too!"""),

("Science", 1, "Our Body", """We have one head, two arms, and two legs.
We see with our eyes, and we hear with our ears.
We smell with our nose, and we taste with our tongue.
Our heart pumps blood around the body. It beats about seventy times a minute.
Our brain helps us think, learn, and remember.
We have 206 bones. They make our body strong.
To stay healthy, we eat fruit and vegetables, drink water, and sleep well.
We also need to move every day. Let's play and exercise!"""),

("Science", 2, "Why Do We Have Seasons?", """Many people think it is hot in summer because the Earth is closer to the sun. But this is not true.
The real reason is the angle of the Earth.
The Earth is not straight. It leans a little to one side, about 23 degrees.
As the Earth goes around the sun, first one half and then the other half leans toward the sun.
When your half leans toward the sun, the sunlight hits it more directly, and the days are longer. This is summer.
When your half leans away, the sunlight is weaker, and the days are shorter. This is winter.
That is why Australia has summer in December, when Vietnam has winter.
Near the equator, the angle does not change much, so it is warm all year.
In many tropical countries, people talk about a rainy season and a dry season instead of summer and winter."""),

("Science", 2, "Elephants", """Elephants are the biggest land animals in the world.
An adult African elephant can weigh more than six tons.
There are two main kinds: African elephants and Asian elephants. Asian elephants are smaller and have smaller ears.
An elephant's trunk is a long nose and an upper lip together. Elephants use it to breathe, smell, drink, and pick up food.
They eat grass, leaves, and fruit for up to sixteen hours a day.
Elephants live in families. The oldest female leads the group.
They are very smart. They remember places and other elephants for many years.
Sadly, there are not many elephants left. People cut down their forests, and some hunters kill them for their tusks.
In Vietnam, only a small number of wild elephants live in national parks, like Yok Don.
Many people now work hard to protect them."""),

("Science", 3, "The First People on the Moon", """On July 16, 1969, a huge rocket left Florida in the United States.
On board were three astronauts: Neil Armstrong, Buzz Aldrin, and Michael Collins. Their mission was called Apollo 11.
After four days, they reached the moon.
Collins stayed in the spaceship, which flew around the moon.
Armstrong and Aldrin climbed into a small landing craft called the Eagle and flew down to the surface.
The landing was dangerous. The computer gave alarms, and there was very little fuel left. But Armstrong flew the Eagle to a safe spot.
On July 20, he stepped onto the moon. He was the first human to do so.
He said: "That's one small step for man, one giant leap for mankind."
About 600 million people watched it live on television.
The two astronauts walked on the moon for about two and a half hours. They collected rocks, took photos, and put up a flag.
Then they flew back to Collins, and all three returned safely to Earth.
Their footprints are still on the moon today, because there is no wind to blow them away."""),

# ---- Tech ---------------------------------------------------------------
("Tech", 1, "My Phone", """I have a phone. It is small and black.
I use it every day.
I call my grandmother, and I send messages to my friends.
I take photos of my cat and of the mountains.
I listen to music and watch videos.
I also use it to learn English. I read stories and study new words.
But I do not use my phone at dinner. My family talks together then.
At night, I turn it off and go to sleep."""),

("Tech", 2, "Staying Safe Online", """The internet is a great place to learn and talk with friends. But it also has dangers.
Here are some rules to stay safe.
Never tell anyone your password, not even your best friend.
Use a different, strong password for each important account.
Be careful with messages from strangers. Some people lie about who they are.
Never send money or personal photos to someone you only know online.
Be careful with links. Some messages say "You won a prize! Click here!" These are often tricks to steal your information.
Think before you post. Once a photo is online, it is very difficult to delete it completely.
If something online makes you feel bad or afraid, tell a parent or a teacher.
You are not alone, and it is not your fault."""),

("Tech", 2, "A Short History of the Internet", """Today, billions of people use the internet every day. But how did it begin?
In 1969, scientists in the United States connected four computers at different universities. They called this network ARPANET.
At first, only scientists and the army used it.
Over the next years, more and more networks joined together. People called this big network of networks the "internet".
In 1971, a programmer sent the first email.
In 1989, a British scientist named Tim Berners-Lee had a new idea: pages with links between them. He called it the World Wide Web.
The first website went online in 1991.
After that, the internet grew very fast. Search engines, online shops, and video sites appeared.
Vietnam connected to the internet in 1997.
Then smartphones put the internet in our pockets.
Today, we use it to learn, work, shop, and stay in touch with people all over the world."""),

("Tech", 2, "Social Media: Good and Bad", """Most young people in Vietnam use social media, like Facebook, Zalo, and TikTok.
Social media has many good sides.
You can stay in touch with friends and family, even when they live far away.
You can learn new things, from English to cooking.
Small businesses can find customers there.
But there are also bad sides.
Many people spend hours every day scrolling, and they sleep less.
Some people compare their lives with the perfect photos of others, and they feel sad.
Fake news spreads quickly, and some people are unkind in the comments.
So what can you do?
Choose what you follow. Follow people who teach you something or make you happy.
Set a time limit on your phone.
Before you share news, check if it is true.
And remember: real friends are more important than likes."""),

("Tech", 3, "What Is Artificial Intelligence?", """Artificial intelligence, or AI, is technology that lets computers do tasks that usually need human intelligence.
For example, AI can recognize faces in photos, translate languages, and answer questions in a chat.
How does it work? Instead of following a list of fixed rules, an AI system learns from huge amounts of examples.
For instance, a program learns to recognize cats after it sees millions of pictures of cats.
Chatbots learn from enormous amounts of text, so they can write answers that sound natural.
AI can be very useful. Doctors use it to find diseases in X-rays. Farmers use it to check the health of their fields. Students use it to practice languages.
But AI also has limits and risks.
It sometimes makes mistakes and says them with great confidence.
It can repeat unfair ideas from the data it learned from.
And some people use it to create fake photos and videos.
So when you use AI, be smart. Check important facts in other sources, protect your personal information, and do your own thinking.
AI is a powerful tool, but people must decide how to use it."""),

# ---- Food ---------------------------------------------------------------
("Food", 1, "Breakfast Around the World", """What do people eat for breakfast?
In Vietnam, many people eat phở or bánh mì.
In England, some people eat eggs, bacon, beans, and toast.
In France, people often eat bread with butter and jam, and they drink coffee.
In Japan, a traditional breakfast is rice, fish, and miso soup.
In Mexico, people eat eggs with tortillas and spicy sauce.
In the United States, pancakes are popular.
What do you eat for breakfast?"""),

("Food", 1, "How to Make a Banana Smoothie", """A banana smoothie is a cold, sweet drink. It is easy to make.
You need two bananas, one glass of milk, one spoon of honey, and some ice.
First, peel the bananas and cut them into pieces.
Then, put the bananas, the milk, and the honey into a blender.
Add the ice.
Turn on the blender for one minute.
Pour the smoothie into two glasses.
Now it is ready. Drink it with a friend. Enjoy!"""),

("Food", 2, "The Food of Ha Giang", """Ha Giang is famous for its mountains, but its food is special too.
Corn is very important here, because rice does not grow well on the rocky hills.
The Hmong people make mèn mén. They grind corn into flour and steam it. They eat it with soup or vegetables.
Cháo ấu tẩu is a famous porridge from Ha Giang. Cooks make it from rice and a bitter root.
The root is dangerous when it is raw, so experienced cooks boil it for many hours.
People say the porridge keeps you warm on cold nights.
Thắng cố is a strong stew of the Hmong people. They cook it in a big pan at the market, and men eat it together with corn wine.
In autumn, the hills turn pink and white with buckwheat flowers.
People make cakes from buckwheat flour, and tourists love them.
Do you know other dishes from your region?"""),

("Food", 2, "Pizza: From Naples to the World", """Pizza is one of the most popular foods in the world. It comes from Naples, a city in the south of Italy.
In the 1700s and 1800s, many poor people lived in Naples. They needed cheap food that they could eat quickly.
So cooks made flat bread with tomato, garlic, oil, and sometimes cheese, and they sold it in the streets.
People tell a famous story about the year 1889. The Queen of Italy, Margherita, visited Naples, and a cook made a special pizza for her.
It had tomato, white mozzarella cheese, and green basil: the colors of the Italian flag.
People called it Pizza Margherita, and it is still very popular today.
In the early 1900s, many Italians moved to the United States, and they took pizza with them.
From there, pizza traveled all over the world.
Today, you can eat pizza with almost anything, even seafood or pineapple.
But in Naples, many people say a real pizza needs only a few simple ingredients."""),

("Food", 3, "Phở: The Story of a Soup", """For many people around the world, phở is the taste of Vietnam.
But where does it come from? Historians do not agree on every detail, but most think phở began in northern Vietnam, around Hanoi and Nam Định, in the early 20th century.
At that time, the cities grew, and many workers needed a cheap, filling meal.
Street sellers carried pots of hot soup on a pole across their shoulders and walked through the streets.
Some people think the soup took ideas from Vietnamese, Chinese, and French cooking. For example, the French ate a lot of beef, and Vietnamese cooks used the bones for broth.
A good phở broth needs many hours. Cooks boil beef bones slowly and add roasted onion, ginger, star anise, cinnamon, and other spices.
In 1954, many people moved from the north to the south, and they brought phở with them.
In the south, people started to add more herbs, bean sprouts, and sauces.
After 1975, Vietnamese people who went abroad opened phở restaurants in the United States, Australia, France, and many other countries.
Today, phở is famous all over the world, and every family and every restaurant believes that its own recipe is the best."""),

# ---- People -------------------------------------------------------------
("People", 1, "Albert Einstein", """Albert Einstein was a famous scientist.
He was born in Germany in 1879.
As a child, he was quiet, and he asked many questions.
He loved math and music. He played the violin.
He had many new ideas about time, space, and light.
In 1921, he won the Nobel Prize in Physics.
Later, he moved to the United States.
Today, many people use the name "Einstein" for a very smart person."""),

("People", 2, "Marie Curie", """Marie Curie was born in Warsaw, Poland, in 1867.
At that time, women in Poland could not study at university.
So Marie worked as a teacher and saved money. Then she moved to Paris and studied physics and math.
She was very poor. Sometimes she studied so hard that she forgot to eat.
In Paris, she met Pierre Curie, a scientist. They married and worked together.
They discovered two new elements: polonium and radium.
In 1903, Marie became the first woman to win a Nobel Prize.
In 1911, she won a second Nobel Prize, this time in chemistry.
She is still the only person with Nobel Prizes in two different sciences.
Her story shows that nothing can stop a curious and determined mind."""),

("People", 2, "Ngô Bảo Châu", """Ngô Bảo Châu is a Vietnamese mathematician.
He was born in Hanoi in 1972. His father was a scientist, and his mother was a doctor.
As a boy, Châu loved math. He studied at a special school for gifted students.
In 1988 and 1989, he competed in the International Mathematical Olympiad. He won a gold medal both times.
Later, he studied in France and became a professor.
For many years, he worked on a very difficult problem in mathematics.
In 2010, he received the Fields Medal. Many people call it "the Nobel Prize of mathematics".
He was the first person from Vietnam to win it.
Today, he works at universities in the United States and in Vietnam, and he helps young Vietnamese students with their research."""),

("People", 2, "Thomas Edison", """Thomas Edison was an American inventor. He was born in 1847.
As a boy, he went to school for only a few months. His mother taught him at home.
He loved books and experiments. At the age of twelve, he sold newspapers on trains, and he did experiments in an empty train car.
Edison is famous for the electric light bulb. Other inventors worked on light bulbs too, but Edison made one that was cheap and lasted a long time.
It was not easy. He and his team tested thousands of materials before they found the right one.
He also improved the telephone and invented a machine that recorded sound, the phonograph.
In his life, he received more than one thousand patents for his inventions.
Edison believed in hard work. For him, every failed experiment taught something new."""),

("People", 3, "Nelson Mandela", """Nelson Mandela was born in 1918 in a small village in South Africa.
At that time, South Africa had a system called apartheid. Under this system, Black people did not have the same rights as white people. They could not vote, and they had to live in separate areas.
Mandela studied law and became a lawyer. He decided to fight against this unfair system.
In 1964, the government sent him to prison for life.
He spent 27 years in prison. For many years, he lived in a tiny cell and worked in a stone quarry.
But he never gave up his hope for a free and equal South Africa.
Around the world, people asked for his freedom.
In 1990, he finally walked out of prison. He was 71 years old.
Instead of revenge, he talked about peace and forgiveness.
In 1993, he won the Nobel Peace Prize, and in 1994, in the first election open to all South Africans, he became the country's first Black president.
Today, people around the world remember him as a symbol of courage and reconciliation."""),

# ---- Legends ------------------------------------------------------------
("Legends", 1, "The Tortoise and the Hare", """A hare was very fast. He always laughed at the slow tortoise.
"You are so slow!" he said.
"Let's have a race," said the tortoise.
The hare laughed. "OK!"
The race started. The hare ran very fast. Soon, he was far ahead.
"The tortoise is too slow," he thought. "I can sleep a little."
He lay down under a tree and fell asleep.
The tortoise walked slowly, but he did not stop.
He passed the sleeping hare and walked on.
When the hare woke up, he ran to the finish. But the tortoise was already there!
Slow and steady wins the race."""),

("Legends", 1, "The Lion and the Mouse", """A big lion slept in the forest.
A little mouse ran over his nose. The lion woke up and caught the mouse.
"Please don't eat me!" said the mouse. "One day, I will help you."
The lion laughed. "You are so small. How can you help me?"
But he let the mouse go.
A few days later, hunters caught the lion in a big net.
The lion roared and roared, but he could not get out.
The mouse heard him. She ran to the net and bit the ropes with her sharp teeth.
Soon, the lion was free.
"Thank you, little friend," said the lion.
Even a small friend can be a great help."""),

("Legends", 2, "Sơn Tinh and Thủy Tinh", """Long ago, the 18th Hùng King had a beautiful daughter named Mị Nương.
Two powerful young men wanted to marry her.
The first was Sơn Tinh, the God of the Mountains. The second was Thủy Tinh, the God of the Water.
The king could not choose, so he gave them a task.
"Bring me a hundred bowls of sticky rice, a hundred bánh chưng, an elephant with nine tusks, a rooster with nine spurs, and a horse with nine manes. The first one to bring these gifts will marry my daughter."
The next morning, Sơn Tinh arrived first with all the gifts, and he took Mị Nương to his mountain.
Thủy Tinh came too late. He was very angry.
He called the rain and the wind, and the water rose higher and higher.
But Sơn Tinh raised the mountains higher and higher too.
After many days, Thủy Tinh was tired, and he went back to the sea.
But he never forgot. People say that every year he sends floods again, and every year Sơn Tinh fights him.
This old legend helped people explain the floods of the rainy season."""),

("Legends", 2, "Thánh Gióng", """Long ago, during the time of the sixth Hùng King, an old couple lived in the village of Gióng.
They had a son, but there was something strange about him. He was three years old, but he did not speak, laugh, or walk.
One day, enemies from the north attacked the country. The king sent messengers to look for heroes.
When the boy heard the messenger, he suddenly spoke: "Mother, call the messenger here!"
He asked the king for an iron horse, an iron whip, and iron armor.
After that, the boy grew very fast. He ate huge amounts of rice, and soon his clothes were too small.
The whole village brought food and cloth to help him.
When the iron horse arrived, the boy stood up and became a giant.
He jumped on the horse and rode into battle. The horse breathed fire.
When his iron whip broke, he pulled up bamboo trees and used them to fight.
Finally, he defeated the enemy.
Then he rode to the top of Sóc Sơn mountain and flew up into the sky with his horse.
People still remember him every year at the Gióng Festival."""),

("Legends", 3, "The Legend of the Returned Sword", """In the 15th century, an army from the north occupied Vietnam. A man named Lê Lợi decided to lead an uprising against them.
At first, his army was small and weak, and it lost many battles.
One day, a fisherman named Lê Thận pulled his net out of the water and found a strange piece of metal. It was the blade of a sword.
Later, Lê Lợi found a sword handle in a banyan tree. When he put the blade and the handle together, they fit perfectly.
On the blade, there were two words: "Thuận Thiên", which means "the will of Heaven".
People believed the sword came from the Dragon King.
With this sword, Lê Lợi's army grew stronger and stronger. After ten years of fighting, they won, and Lê Lợi became king.
One year later, the king went out on a boat on a lake in the capital.
Suddenly, a giant golden turtle rose from the water.
"Your Majesty," said the turtle, "please return the sword to the Dragon King."
The king understood. He held out the sword, and the turtle took it in its mouth and dived back under the water.
From that day, people called the lake Hồ Hoàn Kiếm, the Lake of the Returned Sword.
Today, it lies in the heart of Hanoi, and the small Turtle Tower stands in the middle of it."""),
]

q = lambda s: "'" + s.replace("'", "''") + "'"
out = ["-- Interest categories. Generated by scripts/interest_texts.py."]
for cat, level, title, body in TEXTS:
    out.append(f"INSERT INTO texts (title, body, visibility, category, level) VALUES ({q(title)}, {q(body.strip())}, 'all', {q(cat)}, {level});")
open(sys.argv[1] if len(sys.argv) > 1 else 'migrations/0015_interest_texts.sql', 'w').write('\n'.join(out) + '\n')
print(len(TEXTS), 'texts')
