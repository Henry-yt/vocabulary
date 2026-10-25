import {createRouter, createWebHashHistory, RouteRecordRaw} from "vue-router";
import Vocabulary from "@/view/Vocabulary.vue";
import Story from "@/view/Story.vue";

const routes: RouteRecordRaw[] = [
    {
        name: 'Index',
        path: '/',
        component: Vocabulary,
    },
    {
        name: 'Story',
        path: '/story',
        component: Story,
    },
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})



export  {
    router
}
