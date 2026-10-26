"""More Kids texts (beginner): numbers, days, months, time, colours, shapes, body, clothes,
places, opposites, prepositions, holidays. Writes migrations/0016_kids_more.sql."""
import sys

TEXTS = [
("Kids 17: Numbers 1 to 10", """Let's count!
One, two, three, four, five.
Six, seven, eight, nine, ten.
I have one nose and two eyes.
A cat has four legs.
A hand has five fingers.
I have ten fingers and ten toes.
How many books are on your desk?
There are three books on my desk."""),

("Kids 18: Numbers 11 to 20", """Eleven, twelve, thirteen, fourteen, fifteen.
Sixteen, seventeen, eighteen, nineteen, twenty.
There are twenty students in my class.
There are eleven boys and nine girls.
My brother is thirteen years old.
My sister is sixteen years old.
I have fifteen pencils in my bag.
How old are you?
I am twelve."""),

("Kids 19: Counting by Tens", """Ten, twenty, thirty, forty, fifty.
Sixty, seventy, eighty, ninety, one hundred!
My grandfather is seventy years old.
There are thirty days in June.
There are sixty minutes in one hour.
Our school has one hundred students.
A bowl of phở costs forty thousand dong.
Can you count from ten to one hundred?"""),

("Kids 20: Days of the Week", """There are seven days in a week.
Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday.
On Monday, I have English.
On Tuesday and Thursday, I have math.
On Wednesday, I have music. I love Wednesday!
On Friday, we play football after school.
On Saturday, I help my parents at home.
On Sunday, I visit my grandparents.
What day is it today?"""),

("Kids 21: Months of the Year", """There are twelve months in a year.
January, February, March, April, May, June.
July, August, September, October, November, December.
My birthday is in May.
My mother's birthday is in October.
Tết is in January or February.
School starts in September.
In December, it is very cold in Ha Giang.
When is your birthday?"""),

("Kids 22: What Time Is It?", """What time is it?
It is seven o'clock. I go to school.
It is half past eleven. I eat lunch.
It is five o'clock. I play with my friends.
It is seven o'clock in the evening. I do my homework.
It is nine o'clock. I go to bed.
My little brother goes to bed at eight o'clock.
What time do you go to bed?"""),

("Kids 23: The Four Seasons", """There are four seasons: spring, summer, autumn, and winter.
In spring, the flowers open, and the trees are green.
In summer, it is hot and sunny. We swim in the river.
In autumn, the leaves turn yellow and red. The buckwheat flowers are pink.
In winter, it is cold. Sometimes there is ice on the mountains.
I like spring best.
What is your favorite season?"""),

("Kids 24: Colors Everywhere", """Look around you. Colors are everywhere!
The tomatoes are red. The carrots are orange.
The corn is yellow, and the leaves are green.
The sky is blue, and the grapes are purple.
My dog is brown, and my cat is black and white.
Mix red and white, and you get pink.
Mix blue and yellow, and you get green.
What color is your bag?"""),

("Kids 25: Shapes", """This is a circle. The sun is a circle. A plate is a circle too.
This is a square. My window is a square.
This is a triangle. A slice of watermelon is a triangle.
This is a rectangle. My book is a rectangle. The door is a rectangle too.
This is a star. Stars are in the sky at night.
And this is a heart. I love you!
Can you find a circle in your classroom?"""),

("Kids 26: My Body", """This is my head. These are my eyes, my nose, and my mouth.
I have two ears and a lot of hair.
These are my shoulders, my arms, and my hands.
These are my legs, my knees, and my feet.
I touch my head. I clap my hands.
I stamp my feet. I nod my head.
Now jump! One, two, three!"""),

("Kids 27: My Clothes", """It is cold today.
I wear a warm jacket, a hat, and a scarf.
I wear long trousers and boots.
Yesterday it was hot.
I wore a T-shirt, shorts, and sandals.
My sister wore a pink dress.
On Monday, we wear our school uniform: a white shirt and blue trousers.
What do you wear today?"""),

("Kids 28: My House", """I live in a house with my family.
Our house has a living room, a kitchen, two bedrooms, and a bathroom.
In the living room, there is a table and a TV.
In the kitchen, my mother cooks rice and soup.
I sleep in a bedroom with my brother.
Behind the house, there is a small garden.
We grow vegetables there, and our chickens live there too.
I love my house."""),

("Kids 29: Where Is My Cat?", """Where is my cat?
Is she on the bed? No, she isn't.
Is she under the table? No, she isn't.
Is she in the box? No, she isn't.
Is she behind the door? No, she isn't.
Is she next to the TV? No, she isn't.
Oh, there she is! She is in my bag!
Silly cat!"""),

("Kids 30: Big and Small", """An elephant is big. A mouse is small.
A giraffe is tall. A dog is short.
A rabbit is fast. A turtle is slow.
The sun is hot. Ice is cold.
My grandfather is old. My baby brother is young.
My bag is heavy. A feather is light.
In the morning, I am happy. When it rains, I am sad.
Are you happy today?"""),

("Kids 31: Fruit at the Market", """My mother and I go to the market.
We buy fruit.
We buy five bananas, three mangoes, and two pineapples.
The bananas are yellow, and the mangoes are sweet.
I like oranges, so my mother buys six oranges.
She also buys a big watermelon. It is green outside and red inside.
The fruit is heavy. I carry the bag.
At home, we eat a mango together. It is delicious!"""),

("Kids 32: How I Go to School", """How do you go to school?
I walk to school. It takes fifteen minutes.
My friend Nam goes by bicycle.
Hoa goes by motorbike with her father.
Some students live far away. They go by bus.
In big cities, some children go by car.
In some places, children go to school by boat!
I like walking. I see the mountains and the rice fields."""),

("Kids 33: My Pets and Farm Friends", """I have a dog. His name is Vàng. He is brown and very friendly.
He runs, jumps, and plays with me.
We also have a cow, three pigs, and ten chickens.
The cow eats grass. The pigs eat corn.
The chickens give us eggs every morning.
I feed the chickens before school.
On Sunday, I take Vàng to the river.
He loves the water!"""),

("Kids 34: Happy Tết!", """Tết is the Vietnamese New Year. It is my favorite holiday.
Before Tết, we clean the house and buy flowers.
My mother and my grandmother make bánh chưng.
On the first day of Tết, we wear new clothes.
We visit our grandparents and say, "Happy New Year!"
The adults give the children lucky money in red envelopes.
We eat a lot of good food and play games.
I can't wait for next Tết!"""),

("Kids 35: The Mid-Autumn Festival", """The Mid-Autumn Festival is in the eighth month of the lunar year.
On that night, the moon is big, round, and bright.
Children carry colorful lanterns. Some lanterns look like stars, and some look like fish.
We eat mooncakes and fruit.
We sing songs and watch the lion dance.
My grandmother tells us the story of Chú Cuội, the boy on the moon.
Last year, I made my own lantern. It was a red star.
This year, I will make a fish."""),

("Kids 36: My Hobbies", """I have three hobbies.
I like drawing. I draw animals and mountains.
I like singing. I sing with my sister every evening.
I like playing badminton. I play with my father in the yard.
My friend Linh likes reading. She reads a new book every week.
My friend Tuan likes cooking. He can make fried rice!
What do you like doing in your free time?"""),
]

q = lambda s: "'" + s.replace("'", "''") + "'"
out = ["-- More Kids texts. Generated by scripts/kids_more.py."]
for title, body in TEXTS:
    out.append(f"INSERT INTO texts (title, body, visibility, category, level) VALUES ({q(title)}, {q(body)}, 'all', 'Kids', 1);")
open(sys.argv[1] if len(sys.argv) > 1 else 'migrations/0016_kids_more.sql', 'w').write('\n'.join(out) + '\n')
print(len(TEXTS), 'texts')
