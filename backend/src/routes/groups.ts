export async function handleGetInfo(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  return new Response(
    JSON.stringify({
      name: 'Super coole standard Gruppe!',
      description: 'Das ist eine super coole Gruppe, die jeder kennen sollte.',
      members: ['Alice', 'Bob', 'Charlie'],
      expenses: [
        {
          id: 1,
          description: 'Pizza',
          amount: 30,
          paidBy: 'Alice',
          paidFor: ['Alice', 'Bob'],
        },
        {
          id: 2,
          description: 'Bier',
          amount: 20,
          paidBy: 'Bob',
          paidFor: ['Alice', 'Charlie'],
        },
      ],
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}

export async function handlePostCreate(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  return new Response(`I created the group with id: ${groupId}`);
}
