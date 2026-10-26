"""More school texts: Kids, World, Art, Sport, Politics. Grammar kept to to be, present simple,
past simple and future simple (will). Level 1 beginner, 2 elementary, 3 intermediate.
Also renames the category Vietnam to World. Writes migrations/0014_more_texts.sql."""
import sys

# (category, level, title, body)
TEXTS = [
# ---- Kids ---------------------------------------------------------------
("Kids", 1, "Kids 11: My Weekend", """Last Saturday was a sunny day.
In the morning, I helped my mother in the garden.
We planted beans and corn.
In the afternoon, I played football with my friends.
I was very tired, but I was happy.
On Sunday, we visited my grandmother.
She cooked chicken and rice for us.
It was a great weekend."""),

("Kids", 1, "Kids 12: Tomorrow", """Tomorrow is a special day.
We will go to the market in town.
My father will drive the motorbike.
My mother will buy fruit and vegetables.
I will look at the toys and the books.
Maybe I will get a new pencil.
After that, we will eat pho.
I think tomorrow will be fun."""),

("Kids", 1, "Kids 13: Rain in the Mountains", """It is the rainy season.
Today the sky is gray, and the rain is heavy.
The rivers are full, and the roads are wet.
Yesterday it rained all day.
We stayed at home and played cards.
My little brother drew a picture of a rainbow.
Tomorrow the sun will come back.
Then we will play outside again."""),

("Kids", 1, "Kids 14: My Drawing", """I love drawing.
Last week, I drew a picture of my village.
I drew the mountains, the river, and our house.
I used green, blue, and brown.
My teacher liked my picture.
She put it on the wall in our classroom.
I felt very proud.
Next week, I will draw my family."""),

("Kids", 1, "Kids 15: A Football Match", """Our school has a football team.
I am on the team. I am the goalkeeper.
Yesterday we played against another school.
The other team was strong.
In the first half, they scored one goal.
In the second half, my friend Tuan scored two goals!
We won the match two to one.
Everyone cheered and sang songs."""),

("Kids", 1, "Kids 16: When I Grow Up", """What will you be when you grow up?
I will be a doctor. I want to help sick people.
My friend Hoa will be a teacher, like her mother.
My cousin Long wants to be a pilot.
He loves planes, and he will fly around the world.
My little sister says she will be a cat!
Everyone laughs.
What about you?"""),

# ---- World --------------------------------------------------------------
("World", 2, "Russia 1: A Very Big Country", """Russia is the biggest country in the world.
It is in two parts of the world: Europe and Asia.
The country is so big that it has eleven time zones.
When people in Moscow eat breakfast, people in the far east of Russia eat dinner.
About 146 million people live in Russia.
The capital is Moscow, and another famous city is Saint Petersburg.
Russia has long rivers, big forests, and very cold winters.
Lake Baikal is in Siberia. It is the deepest lake in the world.
The Trans-Siberian Railway goes from Moscow to Vladivostok.
The trip is more than 9,000 kilometers and takes about seven days.
Would you like to travel on this train one day?"""),

("World", 2, "Russia 2: Many Peoples, Many Languages", """Russia is not a country of only one people.
More than 190 different peoples live there.
Most people are Russians, but there are also Tatars, Bashkirs, Chechens, Yakuts, Buryats, and many others.
The Tatars are the second biggest group. Many of them live in Kazan, a city on the Volga River.
People in Russia speak more than one hundred languages.
Russian is the language for the whole country.
But many regions have their own language too.
For example, children in Tatarstan learn Russian and Tatar at school.
Each people has its own songs, food, clothes, and holidays.
In this way, Russia is a little like Vietnam.
Vietnam also has many peoples, like the Kinh, the Hmong, the Tay, and the Dao."""),

("World", 3, "Russia 3: Different Faiths", """Many religions live side by side in Russia.
The biggest one is Orthodox Christianity. Old churches with golden domes stand in many Russian towns.
Islam is the second biggest religion. Millions of Muslims live in Tatarstan, Bashkortostan, and the North Caucasus.
In Kazan, there is a famous place called the Kremlin.
Inside its white walls, a big mosque and an old Christian cathedral stand near each other.
For many visitors, this picture shows the spirit of the city: different faiths, one home.
Buddhism is also part of Russia. Buddhists live in Buryatia near Lake Baikal, in Tuva, and in Kalmykia.
Kalmykia is the only region in Europe where most people follow Buddhism.
Its capital, Elista, has one of the biggest Buddhist temples in Europe.
There are also Jewish communities, and many people do not follow any religion.
People of different faiths celebrate different holidays, but they live in the same cities and often visit each other.
What religions are there in your country?"""),

("World", 2, "Russia 4: Winter and New Year", """Winter in Russia is long and cold.
In Moscow, it often snows from November to March.
In Yakutia, in the north-east, the winter is even colder.
The village of Oymyakon is one of the coldest places where people live.
Once, the temperature there was minus 67 degrees!
For Russians, New Year is the biggest holiday of the year.
Families decorate a New Year tree and cook a big dinner.
At midnight, everyone says "S Novym godom!" That means "Happy New Year!"
Children wait for Ded Moroz, or Grandfather Frost, and his granddaughter, the Snow Maiden.
They bring presents and put them under the tree.
Orthodox Christmas comes after New Year, on the seventh of January."""),

("World", 2, "Japan: The Cherry Blossom Season", """Japan is an island country in East Asia.
Every spring, something beautiful happens there.
The cherry trees open their flowers, and the cities turn pink and white.
The Japanese call these flowers sakura.
In March and April, people watch the news to know when the flowers will open.
Then families and friends go to the parks.
They sit under the trees, eat lunch, and talk. This is called hanami, or "flower watching".
The flowers only stay for about one week. Then the wind blows them away.
For many Japanese people, the sakura show that beautiful things do not last long.
So we must enjoy every moment."""),

("World", 2, "Brazil: Samba and Football", """Brazil is the biggest country in South America.
People there speak Portuguese, not Spanish.
Brazil is famous for two things: samba and football.
Every year, before a Christian holiday called Lent, Brazil has a big festival called Carnival.
In Rio de Janeiro, thousands of dancers wear colorful costumes and dance the samba in the streets.
Millions of people come to watch.
Brazilians also love football.
Their national team won the World Cup five times. No other country won it so many times.
The most famous Brazilian player was Pelé. He won the World Cup three times.
Children in Brazil play football everywhere: on the beach, in the street, and in the park."""),

# ---- Art ----------------------------------------------------------------
("Art", 1, "Music in My Life", """I love music.
Every morning, I listen to songs on the radio.
My father plays the guitar, and my mother sings.
At school, we have a music class on Friday.
Our teacher plays the piano, and we sing together.
Last month, our class sang at the school festival.
I was nervous, but we sang well.
Next year, I will learn to play the flute."""),

("Art", 2, "The Water Puppets of Vietnam", """Water puppetry is a very old art from northern Vietnam.
It started in the villages of the Red River Delta about one thousand years ago.
Farmers made puppets from wood and painted them in bright colors.
The stage is a pool of water.
The puppeteers stand behind a screen, in the water up to their waists.
They move the puppets with long sticks under the water, so the puppets seem to walk and swim by themselves.
The stories show village life: farmers in the rice fields, fishermen, dragons, and festivals.
A funny puppet called Chú Tễu often tells the story and makes the audience laugh.
Musicians play traditional music next to the stage.
Today, you can see water puppets in Hanoi and in many other places in Vietnam."""),

("Art", 2, "Dong Ho Paintings", """Dong Ho is a small village in Bac Ninh province.
For hundreds of years, people there made a special kind of folk painting.
The artists print the pictures from wooden blocks.
They use paper from the bark of the dó tree.
The colors come from nature: black from burnt bamboo leaves, red from soil, and yellow from flowers.
The white color shines because it has tiny pieces of seashell in it.
The pictures show pigs, chickens, children, and happy scenes from village life.
In the past, families bought Dong Ho paintings for Tết and put them on their walls.
They wished for good luck and a rich year."""),

("Art", 2, "The Khèn of the Hmong People", """The khèn is a musical instrument of the Hmong people.
It has six long bamboo pipes and a wooden body.
The player blows into it and moves the fingers over small holes.
The sound is deep and soft, and it is a little like a human voice.
For the Hmong, the khèn is more than an instrument.
Men play it at weddings, at funerals, and at the New Year festival.
A good player plays and dances at the same time. He jumps and turns, but the music never stops.
In Ha Giang, you can hear the khèn at markets and festivals, for example at the Khau Vai love market.
Young Hmong people learn it from their fathers and grandfathers.
In this way, the music goes from one generation to the next."""),

("Art", 2, "Van Gogh and His Sunflowers", """Vincent van Gogh was a painter from the Netherlands.
He was born in 1853.
He started painting late, when he was 27 years old.
He loved bright colors and strong lines.
He painted the fields, the night sky, the people around him, and himself.
His most famous paintings show yellow sunflowers in a vase.
In his life, Van Gogh was poor, and he was often sick and sad.
People say he sold only one painting before he died in 1890.
Today, his paintings are among the most famous in the world.
Millions of people visit the Van Gogh Museum in Amsterdam every year."""),

("Art", 3, "Beethoven, the Composer Who Could Not Hear", """Ludwig van Beethoven was one of the greatest composers in history.
He was born in Germany in 1770.
His father was a singer, and he gave Beethoven his first music lessons.
As a young man, Beethoven moved to Vienna, the city of music.
There he became famous as a pianist and composer.
But when he was about 30 years old, something terrible happened: he started to lose his hearing.
For a musician, this was a nightmare. For a while, he felt very lonely and hopeless.
But he did not stop. He decided to live for his music.
He wrote many of his greatest works when he could hear almost nothing.
In 1824, an orchestra in Vienna played his Ninth Symphony for the first time.
At the end, the audience clapped and cheered, but Beethoven heard nothing.
A singer turned him around. Then he saw the people on their feet. They waved their hats and hands.
Today, a part of this symphony, the "Ode to Joy", is a song of peace and friendship around the world."""),

# ---- Sport --------------------------------------------------------------
("Sport", 1, "Badminton in the Park", """Every evening, my parents go to the park.
They play badminton with their friends.
Badminton is easy to start. You need two rackets and a shuttlecock.
The shuttlecock is light and has feathers.
You hit it over the net, and it must not touch the ground.
Yesterday I played with my father.
He won the first game, but I won the second.
Tomorrow we will play again."""),

("Sport", 1, "Đá Cầu: Kicking the Shuttlecock", """Đá cầu is a popular game in Vietnam.
You kick a shuttlecock with your feet.
You must not use your hands.
Children play it in the school yard at break time.
Old people play it in the park in the morning.
You can play alone, with a friend, or in a big circle.
Some players are very good. They can kick the shuttlecock a hundred times!
It is a fun game, and it keeps you healthy."""),

("Sport", 2, "Football: The World's Game", """Football is the most popular sport in the world.
Millions of people play it, and billions watch it.
Two teams play on a big field. Each team has eleven players.
Only the goalkeeper can touch the ball with the hands.
The other players use their feet, their heads, and their bodies.
The team with more goals wins.
The first World Cup took place in 1930 in Uruguay, and Uruguay won it.
Since then, the World Cup happens every four years.
People in every country watch the matches on TV, in cafés, and on the street.
For a few weeks, the whole world talks about football."""),

("Sport", 2, "A Snowy Final in Changzhou", """In January 2018, Vietnam's under-23 football team played in the Asian Championship in China.
Not many people believed in them.
But the young players and their Korean coach, Park Hang-seo, surprised everyone.
They beat strong teams, one after another, and reached the final.
The final was against Uzbekistan in the city of Changzhou.
On that day, heavy snow fell. The field was white, and the players were very cold.
Most Vietnamese players saw snow for the first time, but they fought hard.
They lost the match 2–1 in the last minute of extra time.
But at home, nobody was sad.
Millions of people went into the streets with red flags to welcome the team.
Later that year, Vietnam won the AFF Cup, the championship of Southeast Asia."""),

("Sport", 2, "Hoang Xuan Vinh's Gold Medal", """In August 2016, the Olympic Games took place in Rio de Janeiro, Brazil.
A Vietnamese soldier named Hoang Xuan Vinh competed in shooting.
His sport was the 10-meter air pistol.
In this sport, you need a steady hand, good eyes, and a calm mind.
Vinh was 41 years old, older than most of the other athletes.
In the final, he shot very well, and he won by a small number of points.
He became the first person from Vietnam to win an Olympic gold medal.
When the Vietnamese national anthem played in Rio, many people at home cried with joy.
His story shows that hard work and patience can lead to great results."""),

("Sport", 2, "The Olympic Games", """The first Olympic Games were in ancient Greece, almost 3,000 years ago.
They took place in Olympia, a town with a big temple.
Only men from Greek cities could compete. They ran, jumped, threw, and wrestled.
More than 1,500 years later, the old games stopped.
In 1896, a Frenchman named Pierre de Coubertin started the modern Olympic Games.
The first modern Games were in Athens, Greece.
Today, the Summer Olympics and the Winter Olympics happen every four years.
Athletes from more than 200 countries compete in them.
The Olympic flag has five rings of different colors.
The rings show the five parts of the world that come together in peace through sport."""),

("Sport", 3, "Chess: A Sport for the Mind", """Is chess a sport? Many people say yes.
Chess has no running and no ball, but players need a strong mind and a lot of energy.
A long game can last for five or six hours, and players often feel very tired at the end.
Chess began in India about 1,500 years ago.
From there, it traveled to Persia, then to the Arab world, and later to Europe.
Over the centuries, the rules changed, and the game became what we know today.
Each player has sixteen pieces: a king, a queen, two rooks, two bishops, two knights, and eight pawns.
The goal is simple: you must trap the other player's king. This is called checkmate.
But the game itself is not simple at all. There are more possible games of chess than atoms in the universe.
Vietnam also has strong chess players. Lê Quang Liêm became a grandmaster, the highest title in chess, at a young age.
Today, millions of people play chess online every day, and many schools teach it to children.
Teachers say chess helps children think carefully, plan ahead, and stay calm."""),

# ---- Politics -----------------------------------------------------------
("Politics", 1, "Rules in Our Class", """Every group needs rules.
In our class, we have five rules.
We come to class on time.
We listen when other people speak.
We help each other.
We keep the classroom clean.
We are kind to everyone.
At the start of the year, we made these rules together.
Everyone voted, and everyone agreed.
A country also has rules. We call them laws."""),

("Politics", 2, "What Is a Government?", """A country is like a very big family.
It needs people to make plans and decisions for everyone.
This group of people is the government.
The government makes laws and collects taxes.
With the tax money, it builds roads, schools, and hospitals.
It also pays teachers, doctors, and police officers.
In most countries, the government has three main parts.
One part makes the laws. Another part leads the country and puts the laws into action.
The third part is the courts. They decide when someone breaks a law.
Different countries organize their governments in different ways, but all governments have the same big job: to take care of the country and its people."""),

("Politics", 2, "The United Nations", """The Second World War ended in 1945.
Millions of people died in that war, and many cities were in ruins.
After the war, world leaders wanted to stop such wars in the future.
So in 1945, fifty-one countries started the United Nations, or the UN.
Today, the UN has 193 member countries. Vietnam joined in 1977.
The main office of the UN is in New York.
Leaders from every member country meet there every year and talk about world problems.
The UN works for peace, but it also helps children, refugees, and poor people.
For example, UNICEF helps children get food, clean water, and an education.
The World Health Organization fights against diseases.
The UN cannot solve every problem, but it gives countries a place to talk instead of fight."""),

("Politics", 3, "ASEAN: Neighbors Working Together", """ASEAN stands for the Association of Southeast Asian Nations.
Five countries started it in 1967: Indonesia, Malaysia, the Philippines, Singapore, and Thailand.
Over the years, more countries joined. Vietnam became a member in 1995.
In 2025, Timor-Leste joined, and today ASEAN has eleven members.
Together, these countries are home to almost 700 million people.
The goal of ASEAN is simple: neighbors in the region should work together.
They trade with each other, solve problems by talking, and help each other after natural disasters.
For example, people from ASEAN countries can visit each other for short trips without a visa.
Every year, ASEAN leaders meet at a summit. Each country takes a turn as the chair.
The members are very different. They have different languages, religions, and political systems.
Some are rich, and some are still poor. Some are big, and some are very small.
But ASEAN shows that different countries can still find common goals.
Do you think ASEAN will become more important in the future?"""),
]

q = lambda s: "'" + s.replace("'", "''") + "'"
out = ["-- More school texts and categories. Generated by scripts/more_texts.py.",
       "UPDATE texts SET category = 'World' WHERE category = 'Vietnam';",
       "UPDATE OR IGNORE class_categories SET category = 'World' WHERE category = 'Vietnam';",
       "DELETE FROM class_categories WHERE category = 'Vietnam';"]
for cat, level, title, body in TEXTS:
    out.append(f"INSERT INTO texts (title, body, visibility, category, level) VALUES ({q(title)}, {q(body)}, 'all', {q(cat)}, {level});")
open(sys.argv[1] if len(sys.argv) > 1 else 'migrations/0014_more_texts.sql', 'w').write('\n'.join(out) + '\n')
print(len(TEXTS), 'texts')
