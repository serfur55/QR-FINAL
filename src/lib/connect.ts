import PocketBase from "pocketbase";
// initialise client
export const pbClient = new PocketBase("http://127.0.0.1:8090");

// we are using typescript for this tutorial as it considered an industry standard
// this code add a todo item to the database
export async function addTodo(todo: any) {
  try {
    const record = await pbClient.collection("todos").create(todo);
    return record;
  } catch (error: any) {
    return { error: error.message };
  }
}
// this fetchs all the todos from database
export async function getTodos(){
    const records =await pbClient.collection('todos').getFullList(200 /* batch size */, {
      sort: '-created',
    });
    return records;
};